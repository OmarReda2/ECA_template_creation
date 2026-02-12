package com.yourcompany.template.domain.exception;

/**
 * Thrown when a requested resource (e.g. template, version) does not exist.
 * Mapped to HTTP 404 by GlobalExceptionHandler.
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
