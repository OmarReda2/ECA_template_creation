package com.yourcompany.template.infrastructure.validation;

/**
 * Validates template schema structure. Technical validation (format, types) here;
 * business invariants remain in domain.
 */
public interface SchemaValidator {

    /**
     * Validate schema and throw or return validation result.
     * @param schemaContent schema to validate
     */
    void validate(Object schemaContent);
}
