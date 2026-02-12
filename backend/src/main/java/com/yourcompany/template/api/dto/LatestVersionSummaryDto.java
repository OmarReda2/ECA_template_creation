package com.yourcompany.template.api.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Latest version summary for GET /api/templates (dashboard list).
 * The version with the highest version_number per template.
 */
public record LatestVersionSummaryDto(
        UUID versionId,
        int versionNumber,
        String status,
        Instant createdAt,
        String createdBy,
        String schemaHash
) {}
