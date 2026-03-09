package com.eca.template.service;

import com.eca.template.dto.CreateVersionResponse;
import com.eca.template.dto.UpdateSchemaResponse;
import com.eca.template.dto.VersionDetailResponse;
import com.eca.template.exception.NotFoundException;
import com.eca.template.exception.VersionNotEditableException;
import com.eca.template.hashing.SchemaHasher;
import com.eca.template.entity.TemplateEntity;
import com.eca.template.entity.TemplateVersionEntity;
import com.eca.template.repository.TemplateJpaRepository;
import com.eca.template.repository.TemplateVersionJpaRepository;
import com.eca.template.validation.SchemaValidator;
import com.eca.template.service.helper.SchemaJsonHelper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class VersionService {
    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_READ_ONLY = "READ_ONLY";
    private final TemplateVersionJpaRepository versionRepository;
    private final TemplateJpaRepository templateRepository;
    private final SchemaValidator schemaValidator;
    private final SchemaHasher schemaHasher;
    private final SchemaJsonHelper schemaJsonHelper;

    public VersionService(
            TemplateVersionJpaRepository versionRepository,
            TemplateJpaRepository templateRepository,
            SchemaValidator schemaValidator,
            SchemaHasher schemaHasher,
            SchemaJsonHelper schemaJsonHelper) {
        this.versionRepository = versionRepository;
        this.templateRepository = templateRepository;
        this.schemaValidator = schemaValidator;
        this.schemaHasher = schemaHasher;
        this.schemaJsonHelper = schemaJsonHelper;
    }

    @Transactional
    public CreateVersionResponse createVersion(UUID templateId, String createdBy) {
        TemplateEntity template = templateRepository.findById(templateId)
                .orElseThrow(() -> new NotFoundException("Template not found: " + templateId));

        TemplateVersionEntity latest = versionRepository.findTopByTemplate_IdOrderByVersionNumberDesc(templateId)
                .orElseThrow(() -> new NotFoundException("No version found for template: " + templateId));

        // Policy: after new version is created, previous latest becomes READ_ONLY.
        latest.setStatus(STATUS_READ_ONLY);
        versionRepository.save(latest);

        JsonNode schemaToClone = latest.getSchemaJson();
        if (schemaToClone == null) {
            schemaToClone = schemaJsonHelper.buildInitialSchemaJson(template.getName(), template.getSectorCode());
        } else {
            schemaToClone = schemaJsonHelper.cloneSchemaJson(schemaToClone);
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
}
