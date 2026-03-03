package com.eca.template.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.eca.template.api.dto.*;
import com.eca.template.domain.exception.NotFoundException;
import com.eca.template.domain.exception.SchemaExportException;
import com.eca.template.domain.exception.VersionNotEditableException;
import com.eca.template.infrastructure.excel.ExcelWorkbookBuilder;
import com.eca.template.infrastructure.hashing.SchemaHasher;
import com.eca.template.infrastructure.persistence.entity.TemplateEntity;
import com.eca.template.infrastructure.persistence.entity.TemplateVersionEntity;
import com.eca.template.infrastructure.persistence.repository.TemplateJpaRepository;
import com.eca.template.infrastructure.persistence.repository.TemplateVersionJpaRepository;
import com.eca.template.infrastructure.validation.SchemaValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.OutputStream;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Application service for template and version use cases.
 * Orchestrates persistence; called only from API layer. No REST or repository exposure to API.
 */
@Service
public class TemplateApplicationService {

    private static final String PLACEHOLDER_HASH = "PENDING_HASH";
    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_READ_ONLY = "READ_ONLY";

    private final TemplateJpaRepository templateRepository;
    private final TemplateVersionJpaRepository versionRepository;
    private final ObjectMapper objectMapper;
    private final SchemaValidator schemaValidator;
    private final SchemaHasher schemaHasher;
    private final ExcelWorkbookBuilder excelWorkbookBuilder;

    public TemplateApplicationService(
            TemplateJpaRepository templateRepository,
            TemplateVersionJpaRepository versionRepository,
            ObjectMapper objectMapper,
            SchemaValidator schemaValidator,
            SchemaHasher schemaHasher,
            ExcelWorkbookBuilder excelWorkbookBuilder) {
        this.templateRepository = templateRepository;
        this.versionRepository = versionRepository;
        this.objectMapper = objectMapper;
        this.schemaValidator = schemaValidator;
        this.schemaHasher = schemaHasher;
        this.excelWorkbookBuilder = excelWorkbookBuilder;
    }

    /** Deep-clone schema JsonNode so the new version has its own copy. */
    private JsonNode cloneSchemaJson(JsonNode node) {
        try {
            return objectMapper.readTree(objectMapper.writeValueAsString(node));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to clone schema JSON", e);
        }
    }

    /**
     * Initial schema_json for a new template/version: templateName, sectorCode, tables[], exportProfile{}.
     * Ensures PUT /schema validation does not fail due to null sectorCode.
     */
    private JsonNode buildInitialSchemaJson(String templateName, String sectorCode) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("templateName", templateName != null ? templateName : "");
        root.put("sectorCode", sectorCode != null ? sectorCode : "");
        root.putArray("tables");
        root.putObject("exportProfile");
        return root;
    }

    @Transactional
    public CreateTemplateResponse createTemplate(String name, String sectorCode, String createdBy) {
        TemplateEntity template = new TemplateEntity();
        template.setName(name);
        template.setSectorCode(sectorCode);
        template.setStatus(STATUS_DRAFT);
        template.setCreatedBy(createdBy);
        template = templateRepository.save(template);

        TemplateVersionEntity v1 = new TemplateVersionEntity();
        v1.setTemplate(template);
        v1.setVersionNumber(1);
        v1.setStatus(STATUS_DRAFT);

        JsonNode schemaJson = buildInitialSchemaJson(template.getName(), template.getSectorCode());
        v1.setSchemaJson(schemaJson);
        String schemaHash = schemaHasher.hash(schemaJson);
        v1.setSchemaHash(schemaHash);

        v1.setCreatedBy(createdBy);
        v1 = versionRepository.save(v1);

        return new CreateTemplateResponse(template.getId(), v1.getId(), 1);
    }

    @Transactional(readOnly = true)
    public TemplateDetailResponse getTemplate(UUID templateId) {
        TemplateEntity template = templateRepository.findById(templateId)
                .orElseThrow(() -> new NotFoundException("Template not found: " + templateId));

        List<TemplateVersionEntity> versionEntities = versionRepository.findByTemplate_IdOrderByVersionNumberDesc(templateId);
        List<VersionSummaryDto> versions = versionEntities.stream()
                .map(v -> new VersionSummaryDto(v.getId(), v.getVersionNumber(), v.getStatus(), v.getCreatedAt()))
                .toList();

        return new TemplateDetailResponse(
                template.getId(),
                template.getName(),
                template.getSectorCode(),
                template.getStatus(),
                template.getCreatedAt(),
                template.getCreatedBy(),
                versions
        );
    }

    /**
     * List all templates for dashboard. Each item includes the latest version (highest version_number).
     * If a template has no versions, latestVersion is null (should not happen in normal flow).
     */
    @Transactional(readOnly = true)
    public List<TemplateSummaryDto> listTemplates() {
        List<TemplateEntity> templates = templateRepository.findAll();
        return templates.stream()
                .map(this::toTemplateSummary)
                .toList();
    }

    private TemplateSummaryDto toTemplateSummary(TemplateEntity template) {
        Optional<TemplateVersionEntity> latestOpt = versionRepository.findTopByTemplate_IdOrderByVersionNumberDesc(template.getId());
        LatestVersionSummaryDto latestVersion = latestOpt.map(v -> new LatestVersionSummaryDto(
                v.getId(),
                v.getVersionNumber(),
                v.getStatus(),
                v.getCreatedAt(),
                v.getCreatedBy(),
                v.getSchemaHash()
        )).orElse(null);
        return new TemplateSummaryDto(
                template.getId(),
                template.getName(),
                template.getSectorCode(),
                template.getStatus(),
                template.getCreatedAt(),
                template.getCreatedBy(),
                latestVersion
        );
    }

    @Transactional
    public CreateVersionResponse createVersion(UUID templateId, String createdBy) {
        TemplateEntity template = templateRepository.findById(templateId)
                .orElseThrow(() -> new NotFoundException("Template not found: " + templateId));

        TemplateVersionEntity latest = versionRepository.findTopByTemplate_IdOrderByVersionNumberDesc(templateId)
                .orElseThrow(() -> new NotFoundException("No version found for template: " + templateId));

        // Policy: after new version is created, previous latest becomes READ_ONLY (Slice 3 may enforce editability in domain).
        latest.setStatus(STATUS_READ_ONLY);
        versionRepository.save(latest);

        JsonNode schemaToClone = latest.getSchemaJson();
        if (schemaToClone == null) {
            schemaToClone = buildInitialSchemaJson(template.getName(), template.getSectorCode());
        } else {
            schemaToClone = cloneSchemaJson(schemaToClone);
        }

        int nextVersionNumber = latest.getVersionNumber() + 1;
        TemplateVersionEntity newVersion = new TemplateVersionEntity();
        newVersion.setTemplate(template);
        newVersion.setVersionNumber(nextVersionNumber);
        newVersion.setStatus(STATUS_DRAFT);
        newVersion.setSchemaJson(schemaToClone);
        newVersion.setSchemaHash(latest.getSchemaHash());
        newVersion.setCreatedBy(createdBy);
        newVersion = versionRepository.save(newVersion);

        return new CreateVersionResponse(newVersion.getId(), nextVersionNumber);
    }

    @Transactional(readOnly = true)
    public VersionDetailResponse getVersion(UUID versionId) {
        TemplateVersionEntity version = versionRepository.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Version not found: " + versionId));

        return new VersionDetailResponse(
                version.getId(),
                version.getTemplate().getId(),
                version.getVersionNumber(),
                version.getStatus(),
                version.getSchemaJson(),
                version.getSchemaHash(),
                version.getCreatedAt(),
                version.getCreatedBy()
        );
    }

    /**
     * Update schema for a version: validate, canonicalize, hash, persist.
     * Only the latest version of a template is editable (409 if not).
     */
    @Transactional
    public UpdateSchemaResponse updateSchema(UUID versionId, JsonNode schemaJson) {
        TemplateVersionEntity version = versionRepository.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Version not found: " + versionId));

        TemplateVersionEntity latest = versionRepository.findTopByTemplate_IdOrderByVersionNumberDesc(version.getTemplate().getId())
                .orElseThrow(() -> new NotFoundException("No latest version for template"));
        if (!latest.getId().equals(versionId)) {
            throw new VersionNotEditableException("Only the latest version is editable; this version is not the latest");
        }

        schemaValidator.validate(schemaJson);
        String schemaHash = schemaHasher.hash(schemaJson);

        version.setSchemaJson(schemaJson);
        version.setSchemaHash(schemaHash);
        versionRepository.save(version);

        return new UpdateSchemaResponse(version.getId(), schemaHash);
    }

    /**
     * Returns the attachment filename for exporting this version (templateName_vN.xlsx).
     * Use before writing the workbook so the controller can set Content-Disposition.
     */
    @Transactional(readOnly = true)
    public String getExportFilename(UUID versionId) {
        TemplateVersionEntity version = versionRepository.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Version not found: " + versionId));
        String templateName = version.getTemplate().getName();
        return sanitizeExportFilename(templateName) + "_v" + version.getVersionNumber() + ".xlsx";
    }

    /**
     * Writes the XLSX workbook for this version to the output stream (ExportExcel use case).
     */
    @Transactional(readOnly = true)
    public void writeExportWorkbook(UUID versionId, OutputStream outputStream) {
        TemplateVersionEntity version = versionRepository.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Version not found: " + versionId));
        JsonNode schemaJson = version.getSchemaJson();
        if (schemaJson == null || !schemaJson.has("tables") || !schemaJson.get("tables").isArray()) {
            throw new SchemaExportException("Schema is missing tables array required for export");
        }
        String templateName = version.getTemplate().getName();
        excelWorkbookBuilder.writeWorkbook(
                schemaJson,
                templateName,
                version.getTemplate().getId(),
                version.getId(),
                version.getVersionNumber(),
                version.getSchemaHash(),
                outputStream
        );
    }

    private static String sanitizeExportFilename(String name) {
        if (name == null || name.isBlank()) return "template";
        return name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
    }
}
