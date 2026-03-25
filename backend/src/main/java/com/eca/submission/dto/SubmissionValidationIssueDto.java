package com.eca.submission.dto;

public record SubmissionValidationIssueDto(
        String code,
        String sheetName,
        String headerName,
        String message
) {}
