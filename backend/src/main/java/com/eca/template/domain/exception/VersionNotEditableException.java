package com.eca.template.domain.exception;

/**
 * Thrown when an update is attempted on a version that is not the latest (editability rule).
 * Mapped to HTTP 409 Conflict by GlobalExceptionHandler.
 */
public class VersionNotEditableException extends RuntimeException {

    public VersionNotEditableException(String message) {
        super(message);
    }
}
