package com.eca.template.api.dto;

import java.util.UUID;

/**
 * Response for POST /api/templates/{templateId}/versions.
 */
public record CreateVersionResponse(
        UUID versionId,
        int versionNumber
) {}
