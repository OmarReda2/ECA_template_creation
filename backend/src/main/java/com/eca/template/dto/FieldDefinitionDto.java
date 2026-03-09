package com.eca.template.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FieldDefinitionDto(
        String fieldKey,
        String headerName,
        String type,
        Boolean required,
        FieldValidationsDto validations
) {}
