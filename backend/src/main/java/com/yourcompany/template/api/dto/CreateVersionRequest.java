package com.yourcompany.template.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/templates/{templateId}/versions.
 */
public record CreateVersionRequest(
        @NotBlank(message = "createdBy is required")
        @Size(max = 255)
        String createdBy
) {}
