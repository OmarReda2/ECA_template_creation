package com.eca.submission.dto;

import java.util.List;

public record SubmissionStructureValidationSheetDto(
        String sheetName,
        List<String> missingHeaders,
        List<String> extraHeaders
) {}
