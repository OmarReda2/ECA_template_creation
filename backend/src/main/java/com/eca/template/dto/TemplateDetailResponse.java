package com.eca.template.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response for GET /api/templates/{templateId}. Template metadata + version summaries only.
 */
public record TemplateDetailResponse(
        UUID id,
        String name,
        String sectorCode,
        String status,
        Instant createdAt,
        String createdBy,
        List<VersionSummaryDto> versions
) {}
