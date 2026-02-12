package com.yourcompany.template.domain.exception;

/**
 * Base domain exception. Domain layer only; no web/DB dependencies.
 */
public class DomainException extends RuntimeException {

    public DomainException(String message) {
        super(message);
    }

    public DomainException(String message, Throwable cause) {
        super(message, cause);
    }
}
