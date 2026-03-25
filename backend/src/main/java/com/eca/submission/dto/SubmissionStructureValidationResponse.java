package com.eca.submission.dto;

import java.util.UUID;
import java.util.List;

public record SubmissionStructureValidationResponse(
        SubmissionResolvedVersionDto targetVersion,
        UUID submissionId,
        int sheetsChecked,
        int rowsChecked,
        List<SubmissionValidationIssueDto> errors,
        List<SubmissionValidationIssueDto> warnings,
        List<SubmissionStructureValidationSheetDto> sheetIssues
) {}
