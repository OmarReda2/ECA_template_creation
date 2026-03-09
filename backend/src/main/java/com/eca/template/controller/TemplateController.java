package com.eca.template.controller;

import com.eca.template.dto.*;
import com.eca.template.service.TemplateService;
import com.eca.template.service.VersionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * API controller for template operations. Delegates to application layer only.
 */
@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateService templateService;
    private final VersionService versionService;


    public TemplateController(TemplateService templateService, VersionService versionService) {
        this.templateService = templateService;
        this.versionService = versionService;
    }

    @PostMapping
    public ResponseEntity<CreateTemplateResponse> createTemplate(@Valid @RequestBody CreateTemplateRequest request) {
        CreateTemplateResponse response = templateService.createTemplate(
                request.name(),
                request.sectorCode(),
                request.createdBy()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public List<TemplateSummaryDto> listTemplates() {
        return templateService.listTemplates();
    }

    @GetMapping("/{templateId}")
    public TemplateDetailResponse getTemplate(@PathVariable UUID templateId) {
        return templateService.getTemplate(templateId);
    }

    @PostMapping("/{templateId}/versions")
    public ResponseEntity<CreateVersionResponse> createVersion(
            @PathVariable UUID templateId,
            @Valid @RequestBody CreateVersionRequest request) {
        CreateVersionResponse response = versionService.createVersion(templateId, request.createdBy());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
