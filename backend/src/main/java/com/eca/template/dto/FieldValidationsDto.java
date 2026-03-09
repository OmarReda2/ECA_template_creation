package com.eca.template.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FieldValidationsDto(
        List<String> enumValues,
        Number min,
        Number max
) {}
