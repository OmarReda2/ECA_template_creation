package com.yourcompany.template.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Request body for PUT /api/versions/{versionId}/schema.
 * Represents the full schema definition (validated in infrastructure, then canonicalized/hashed).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UpdateSchemaRequest(
        String templateName,
        String sectorCode,
        List<TableDefinitionDto> tables,
        ExportProfileDto exportProfile
) {
    public UpdateSchemaRequest {
        if (tables == null) {
            tables = List.of();
        }
    }
}
