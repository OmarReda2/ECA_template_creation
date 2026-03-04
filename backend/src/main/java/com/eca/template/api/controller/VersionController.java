package com.eca.template.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.eca.template.api.dto.ExportRequest;
import com.eca.template.api.dto.UpdateSchemaRequest;
import com.eca.template.api.dto.UpdateSchemaResponse;
import com.eca.template.api.dto.VersionDetailResponse;
import com.eca.template.application.service.TemplateApplicationService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * API controller for version operations. Delegates to application layer only.
 */
@RestController
@RequestMapping("/api/versions")
public class VersionController {

    private static final String XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final TemplateApplicationService templateService;
    private final ObjectMapper objectMapper;

    public VersionController(TemplateApplicationService templateService, ObjectMapper objectMapper) {
        this.templateService = templateService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/{versionId}")
    public VersionDetailResponse getVersion(@PathVariable UUID versionId) {
        return templateService.getVersion(versionId);
    }

    @PutMapping("/{versionId}/schema")
    public UpdateSchemaResponse updateSchema(
            @PathVariable UUID versionId,
            @RequestBody UpdateSchemaRequest request) {
        JsonNode schemaJson = objectMapper.valueToTree(request);
        return templateService.updateSchema(versionId, schemaJson);
    }

    @PostMapping(value = "/{versionId}/export", produces = XLSX_CONTENT_TYPE)
    public void exportVersion(
            @PathVariable UUID versionId,
            @RequestBody(required = false) ExportRequest request,
            HttpServletResponse response) throws IOException {
        if (request != null && request.format() != null && !"XLSX".equalsIgnoreCase(request.format().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only XLSX format is supported. Got: " + request.format());
        }
        String filename = templateService.getExportFilename(versionId, request != null ? request.fileName() : null);
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        response.setContentType(XLSX_CONTENT_TYPE);
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename);
        templateService.writeExportWorkbook(versionId, response.getOutputStream(), request);
        response.getOutputStream().flush();
    }
}
