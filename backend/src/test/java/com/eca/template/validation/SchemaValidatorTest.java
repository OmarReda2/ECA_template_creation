package com.eca.template.validation;

import com.eca.template.validation.SchemaValidator;
import com.eca.template.validation.SchemaValidatorImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.eca.template.exception.SchemaValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Validation rules: duplicate tableKey, duplicate fieldKey, invalid sheetName, min > max -> 400.
 */
class SchemaValidatorTest {

    private SchemaValidator validator;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        validator = new SchemaValidatorImpl();
        objectMapper = new ObjectMapper();
    }

    @Test
    void duplicateTableKey_throwsWithStructuredErrors() throws Exception {
        JsonNode schema = objectMapper.readTree("""
            {
              "sectorCode": "S1",
              "tables": [
                { "tableKey": "t1", "sheetName": "S1", "fields": [] },
                { "tableKey": "t1", "sheetName": "S2", "fields": [] }
              ]
            }
            """);

        assertThatThrownBy(() -> validator.validate(schema))
                .isInstanceOf(SchemaValidationException.class)
                .satisfies(ex -> {
                    SchemaValidationException e = (SchemaValidationException) ex;
                    assertThat(e.getErrors()).anyMatch(err ->
                            err.path().contains("tableKey") && err.message().contains("duplicate"));
                });
    }

    @Test
    void duplicateFieldKey_throwsWithStructuredErrors() throws Exception {
        JsonNode schema = objectMapper.readTree("""
            {
              "sectorCode": "S1",
              "tables": [
                {
                  "tableKey": "t1",
                  "sheetName": "Sheet1",
                  "fields": [
                    { "fieldKey": "f1", "headerName": "H1", "type": "TEXT" },
                    { "fieldKey": "f1", "headerName": "H2", "type": "TEXT" }
                  ]
                }
              ]
            }
            """);

        assertThatThrownBy(() -> validator.validate(schema))
                .isInstanceOf(SchemaValidationException.class)
                .satisfies(ex -> {
                    SchemaValidationException e = (SchemaValidationException) ex;
                    assertThat(e.getErrors()).anyMatch(err ->
                            err.path().contains("fieldKey") && err.message().contains("duplicate"));
                });
    }

    @Test
    void invalidSheetNameChar_throwsWithStructuredErrors() throws Exception {
        JsonNode schema = objectMapper.readTree("""
            {
              "sectorCode": "S1",
              "tables": [
                { "tableKey": "t1", "sheetName": "Sheet/1", "fields": [] }
              ]
            }
            """);

        assertThatThrownBy(() -> validator.validate(schema))
                .isInstanceOf(SchemaValidationException.class)
                .satisfies(ex -> {
                    SchemaValidationException e = (SchemaValidationException) ex;
                    assertThat(e.getErrors()).anyMatch(err ->
                            err.path().contains("sheetName") && err.message().contains("must not contain"));
                });
    }

    @Test
    void minGreaterThanMax_throwsWithStructuredErrors() throws Exception {
        JsonNode schema = objectMapper.readTree("""
            {
              "sectorCode": "S1",
              "tables": [
                {
                  "tableKey": "t1",
                  "sheetName": "Sheet1",
                  "fields": [
                    {
                      "fieldKey": "f1",
                      "headerName": "H1",
                      "type": "NUMBER",
                      "validations": { "min": 10, "max": 5 }
                    }
                  ]
                }
              ]
            }
            """);

        assertThatThrownBy(() -> validator.validate(schema))
                .isInstanceOf(SchemaValidationException.class)
                .satisfies(ex -> {
                    SchemaValidationException e = (SchemaValidationException) ex;
                    assertThat(e.getErrors()).anyMatch(err ->
                            err.message().contains("min must be <= max"));
                });
    }

    @Test
    void validMinimalSchema_passes() throws Exception {
        JsonNode schema = objectMapper.readTree("""
            {
              "sectorCode": "S1",
              "tables": [
                { "tableKey": "t1", "sheetName": "Sheet1", "fields": [] }
              ]
            }
            """);
        validator.validate(schema);
    }
}
