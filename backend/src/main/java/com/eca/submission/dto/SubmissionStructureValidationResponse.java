package com.eca.submission.dto;

import java.util.List;

public record SubmissionStructureValidationResponse(
        SubmissionResolvedVersionDto targetVersion,
        int sheetsChecked,
        List<SubmissionValidationIssueDto> errors,
        List<SubmissionValidationIssueDto> warnings,
        List<SubmissionStructureValidationSheetDto> sheetIssues
) {}
