package com.yourcompany.template.api.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Version summary (no schema_json). Used in template detail response.
 */
public record VersionSummaryDto(
        UUID id,
        int versionNumber,
        String status,
        Instant createdAt
) {}
