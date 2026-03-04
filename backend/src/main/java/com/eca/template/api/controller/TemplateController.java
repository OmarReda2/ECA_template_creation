package com.eca.template.api.controller;

import com.eca.template.api.dto.*;
import com.eca.template.application.service.TemplateApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * API controller for template operations. Delegates to application layer only.
 */
@Tag(name = "Template API", description = "Operations related to templates")
@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateApplicationService templateService;

    public TemplateController(TemplateApplicationService templateService) {
        this.templateService = templateService;
    }

    @PostMapping
    @Operation(summary = "Create a new template", description = "Creates a template and automatically creates version 1 in DRAFT status.")
    public ResponseEntity<CreateTemplateResponse> createTemplate(@Valid @RequestBody CreateTemplateRequest request) {
        CreateTemplateResponse response = templateService.createTemplate(
                request.name(),
                request.sectorCode(),
                request.createdBy()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Listing all templates", description = "Returns all templates with a summary of their latest version.")
    public List<TemplateSummaryDto> listTemplates() {
        return templateService.listTemplates();
    }

    @GetMapping("/{templateId}")
    @Operation(summary = "Get template details", description = "Returns template metadata and its versions (versions + template belong to/meta data).")
    public TemplateDetailResponse getTemplate(@PathVariable UUID templateId) {
        return templateService.getTemplate(templateId);
    }

    @PostMapping("/{templateId}/versions")
    @Operation(summary = "Create a new version", description = "Clones the latest version schema into a new version and marks the previous latest as READ_ONLY.")
    public ResponseEntity<CreateVersionResponse> createVersion(
            @PathVariable UUID templateId,
            @Valid @RequestBody CreateVersionRequest request) {
        CreateVersionResponse response = templateService.createVersion(templateId, request.createdBy());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
