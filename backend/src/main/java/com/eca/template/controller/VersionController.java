package com.eca.template.controller;

import com.eca.template.dto.ExportRequest;
import com.eca.template.dto.UpdateSchemaRequest;
import com.eca.template.dto.UpdateSchemaResponse;
import com.eca.template.dto.VersionDetailResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.eca.template.service.VersionService;
import com.eca.template.service.ExportService;

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

    private final VersionService versionService;
    private final ObjectMapper objectMapper;
    private final ExportService exportService;

    public VersionController(VersionService versionService, ObjectMapper objectMapper, ExportService exportService) {
        this.versionService = versionService;
        this.objectMapper = objectMapper;
        this.exportService = exportService;
    }

    @GetMapping("/{versionId}")
    public VersionDetailResponse getVersion(@PathVariable UUID versionId) {
        return versionService.getVersion(versionId);
    }

    @PutMapping("/{versionId}/schema")
    public UpdateSchemaResponse updateSchema(
            @PathVariable UUID versionId,
            @RequestBody UpdateSchemaRequest request) {
        JsonNode schemaJson = objectMapper.valueToTree(request);
        return versionService.updateSchema(versionId, schemaJson);
    }

    @PostMapping(value = "/{versionId}/export", produces = XLSX_CONTENT_TYPE)
    public void exportVersion(
            @PathVariable UUID versionId,
            @RequestBody(required = false) ExportRequest request,
            HttpServletResponse response) throws IOException {
        if (request != null && request.format() != null && !"XLSX".equalsIgnoreCase(request.format().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only XLSX format is supported. Got: " + request.format());
        }
        String filename = exportService.getExportFilename(versionId, request != null ? request.fileName() : null);
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        response.setContentType(XLSX_CONTENT_TYPE);
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename);
        exportService.writeExportWorkbook(versionId, response.getOutputStream(), request);
        response.getOutputStream().flush();
    }
}
