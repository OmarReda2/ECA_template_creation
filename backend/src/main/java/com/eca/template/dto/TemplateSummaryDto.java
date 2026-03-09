package com.eca.template.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Response item for GET /api/templates. Template summary with latest version only.
 */
public record TemplateSummaryDto(
        UUID templateId,
        String name,
        String sectorCode,
        String status,
        Instant createdAt,
        String createdBy,
        LatestVersionSummaryDto latestVersion
) {}
