package com.eca.template.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Request body for POST /api/versions/{versionId}/export.
 * Only XLSX format is supported; other formats return 400.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExportRequest(
        String format,
        String fileName,
        Boolean includeInstructionsSheet,
        Boolean includeValidationRules,
        Boolean protectSheets
) {}
