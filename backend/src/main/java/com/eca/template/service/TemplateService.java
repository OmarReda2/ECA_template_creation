package com.eca.template.service;

import com.eca.template.exception.NotFoundException;
import com.eca.template.dto.CreateTemplateResponse;
import com.eca.template.dto.TemplateDetailResponse;
import com.eca.template.dto.TemplateSummaryDto;
import com.eca.template.dto.VersionSummaryDto;
import com.eca.template.entity.TemplateEntity;
import com.eca.template.entity.TemplateVersionEntity;
import com.eca.template.repository.TemplateJpaRepository;
import com.eca.template.repository.TemplateVersionJpaRepository;
import com.eca.template.service.helper.SchemaJsonHelper;
import com.eca.template.service.mapper.TemplateDtoMapper;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class TemplateService {

    private static final String STATUS_DRAFT = "DRAFT";
    private static final String PLACEHOLDER_HASH = "PENDING_HASH";
    private final TemplateJpaRepository templateRepository;
    private final TemplateVersionJpaRepository versionRepository;
    private final SchemaJsonHelper schemaJsonHelper;
    private final TemplateDtoMapper templateDtoMapper;

    public TemplateService(
            TemplateJpaRepository templateRepository,
            TemplateVersionJpaRepository versionRepository,
            SchemaJsonHelper schemaJsonHelper, TemplateDtoMapper templateDtoMapper) {
        this.templateRepository = templateRepository;
        this.versionRepository = versionRepository;
        this.schemaJsonHelper = schemaJsonHelper;
        this.templateDtoMapper = templateDtoMapper;
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
        v1.setSchemaJson(schemaJsonHelper.buildInitialSchemaJson(template.getName(), template.getSectorCode()));
        v1.setSchemaHash(PLACEHOLDER_HASH);
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
                .map(template -> {
                    TemplateVersionEntity latestVersion =
                            versionRepository
                                    .findTopByTemplate_IdOrderByVersionNumberDesc(template.getId())
                                    .orElse(null);

                    return templateDtoMapper.toTemplateSummary(template, latestVersion);
                })
                .toList();
    }



}
