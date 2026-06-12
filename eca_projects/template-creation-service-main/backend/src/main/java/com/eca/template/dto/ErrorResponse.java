package com.eca.template.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

/**
 * Standardized error response body for all API errors. Used by GlobalExceptionHandler.
 * All controllers return this shape via @ControllerAdvice.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        String traceId,
        List<FieldError> fieldErrors
) {
    public ErrorResponse(int status, String error, String message, String path, String traceId) {
        this(Instant.now(), status, error, message, path, traceId, null);
    }

    public ErrorResponse(int status, String error, String message, String path, String traceId, List<FieldError> fieldErrors) {
        this(Instant.now(), status, error, message, path, traceId, fieldErrors);
    }

    public record FieldError(String field, String message) {}
}
