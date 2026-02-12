package com.yourcompany.template.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/templates.
 */
public record CreateTemplateRequest(
        @NotBlank(message = "name is required")
        @Size(max = 255)
        String name,

        @NotBlank(message = "sectorCode is required")
        @Size(max = 64)
        String sectorCode,

        @NotBlank(message = "createdBy is required")
        @Size(max = 255)
        String createdBy
) {}
