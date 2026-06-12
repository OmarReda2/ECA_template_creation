package com.eca.submission.dto;

public record SubmissionValidationIssueDto(
        String severity,
        String code,
        String sheetName,
        Integer rowNumber,
        String headerName,
        String message
) {}
