package com.eca.template.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExportProfileDto(
        String format,
        Boolean includeInstructionsSheet,
        Boolean includeValidationRules,
        Boolean protectSheets
) {}
