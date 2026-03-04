package com.eca.template.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.eca.template.api.dto.UpdateSchemaRequest;
import com.eca.template.api.dto.UpdateSchemaResponse;
import com.eca.template.api.dto.VersionDetailResponse;
import com.eca.template.application.service.TemplateApplicationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * API controller for version operations. Delegates to application layer only.
 */
@Tag(name = "Version API", description = "Operation related to template versions")
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
            HttpServletResponse response) throws IOException {
        String filename = templateService.getExportFilename(versionId);
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        response.setContentType(XLSX_CONTENT_TYPE);
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename);
        templateService.writeExportWorkbook(versionId, response.getOutputStream());
        response.getOutputStream().flush();
    }
}
