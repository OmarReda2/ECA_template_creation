package com.yourcompany.template.domain.exception;

/**
 * Thrown when schema is missing essential parts for export (e.g. tables/fields malformed).
 * Mapped to HTTP 400 by GlobalExceptionHandler.
 */
public class SchemaExportException extends RuntimeException {

    public SchemaExportException(String message) {
        super(message);
    }
}
