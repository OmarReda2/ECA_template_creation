package com.yourcompany.template.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TableDefinitionDto(
        String tableKey,
        String sheetName,
        Integer order,
        List<FieldDefinitionDto> fields
) {
    public TableDefinitionDto {
        if (fields == null) {
            fields = List.of();
        }
    }
}
