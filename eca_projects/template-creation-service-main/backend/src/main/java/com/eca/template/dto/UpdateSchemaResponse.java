package com.eca.template.dto;

import java.util.UUID;

/**
 * Response for PUT /api/versions/{versionId}/schema.
 */
public record UpdateSchemaResponse(
        UUID versionId,
        String schemaHash
) {}
