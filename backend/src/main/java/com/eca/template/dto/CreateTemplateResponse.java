package com.eca.template.dto;

import java.util.UUID;

/**
 * Response for POST /api/templates.
 */
public record CreateTemplateResponse(
        UUID templateId,
        UUID versionId,
        int versionNumber
) {}
