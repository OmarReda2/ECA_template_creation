package com.eca.template.controller;

import com.eca.template.dto.ErrorResponse;
import com.eca.template.exception.DomainException;
import com.eca.template.exception.NotFoundException;
import com.eca.template.exception.SchemaExportException;
import com.eca.template.exception.SchemaValidationException;
import com.eca.template.exception.VersionNotEditableException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Global exception handling. All controllers return the same ErrorResponse JSON shape.
 * Maps: NotFound -> 404, Validation -> 400, NotEditable/Conflict -> 409, Generic -> 500 (no stack trace).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String TRACE_ID_MDC = "traceId";

    private static ErrorResponse build(int status, String error, String message, String path, List<ErrorResponse.FieldError> fieldErrors) {
        String traceId = MDC.get(TRACE_ID_MDC);
        return fieldErrors != null && !fieldErrors.isEmpty()
                ? new ErrorResponse(status, error, message, path, traceId, fieldErrors)
                : new ErrorResponse(status, error, message, path, traceId);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFoundException(
            NotFoundException ex,
            HttpServletRequest request) {
        ErrorResponse body = build(
                HttpStatus.NOT_FOUND.value(),
                "NOT_FOUND",
                ex.getMessage(),
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(VersionNotEditableException.class)
    public ResponseEntity<ErrorResponse> handleVersionNotEditable(
            VersionNotEditableException ex,
            HttpServletRequest request) {
        ErrorResponse body = build(
                HttpStatus.CONFLICT.value(),
                "VERSION_NOT_EDITABLE",
                ex.getMessage(),
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(SchemaExportException.class)
    public ResponseEntity<ErrorResponse> handleSchemaExport(
            SchemaExportException ex,
            HttpServletRequest request) {
        ErrorResponse body = build(
                HttpStatus.BAD_REQUEST.value(),
                "SCHEMA_EXPORT_ERROR",
                ex.getMessage(),
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(SchemaValidationException.class)
    public ResponseEntity<ErrorResponse> handleSchemaValidation(
            SchemaValidationException ex,
            HttpServletRequest request) {
        List<ErrorResponse.FieldError> fieldErrors = ex.getErrors().stream()
                .map(e -> new ErrorResponse.FieldError(e.path(), e.message()))
                .collect(Collectors.toList());
        ErrorResponse body = build(
                HttpStatus.BAD_REQUEST.value(),
                "SCHEMA_VALIDATION_ERROR",
                ex.getMessage(),
                request.getRequestURI(),
                fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ErrorResponse> handleDomainException(
            DomainException ex,
            HttpServletRequest request) {
        ErrorResponse body = build(
                HttpStatus.UNPROCESSABLE_ENTITY.value(),
                "DOMAIN_ERROR",
                ex.getMessage(),
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex,
            HttpServletRequest request) {
        String message = ex.getName() + " must be a valid UUID";
        ErrorResponse body = build(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_INPUT",
                message,
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        List<ErrorResponse.FieldError> fieldErrors = ex.getBindingResult().getFieldErrors()
                .stream()
                .map(fe -> new ErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
                .collect(Collectors.toList());
        ErrorResponse body = build(
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_ERROR",
                "Request validation failed",
                request.getRequestURI(),
                fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex,
            HttpServletRequest request) {
        ErrorResponse body = build(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_ERROR",
                "An unexpected error occurred",
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
