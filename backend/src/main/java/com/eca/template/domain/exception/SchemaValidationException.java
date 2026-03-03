package com.eca.template.domain.exception;

import java.util.List;

/**
 * Thrown when schema validation fails. Carries structured errors (path + message).
 * Mapped to HTTP 400 by GlobalExceptionHandler.
 */
public class SchemaValidationException extends RuntimeException {

    private final List<SchemaValidationError> errors;

    public SchemaValidationException(String message, List<SchemaValidationError> errors) {
        super(message);
        this.errors = errors != null ? List.copyOf(errors) : List.of();
    }

    public List<SchemaValidationError> getErrors() {
        return errors;
    }

    public record SchemaValidationError(String path, String message) {}
}
