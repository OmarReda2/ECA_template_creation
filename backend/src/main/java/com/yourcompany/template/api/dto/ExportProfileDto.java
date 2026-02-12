package com.yourcompany.template.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExportProfileDto(
        String format,
        Boolean includeInstructionsSheet,
        Boolean protectSheets
) {}
