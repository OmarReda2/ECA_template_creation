package com.eca.template.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

/**
 * Response for GET /api/versions/{versionId}. Includes schema_json and schema_hash.
 */
public record VersionDetailResponse(
        UUID id,
        UUID templateId,
        int versionNumber,
        String status,
        JsonNode schemaJson,
        String schemaHash,
        Instant createdAt,
        String createdBy
) {}
