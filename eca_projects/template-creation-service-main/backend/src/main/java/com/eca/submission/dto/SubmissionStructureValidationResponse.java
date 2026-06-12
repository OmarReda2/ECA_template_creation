package com.eca.submission.dto;

import com.eca.submission.model.SubmissionValidationTargetSource;

import java.util.UUID;
import java.util.List;

public record SubmissionStructureValidationResponse(
        SubmissionResolvedVersionDto targetVersion,
        SubmissionValidationTargetSource validationTargetSource,
        boolean manualFallbackUsed,
        UUID submissionId,
        int sheetsChecked,
        int rowsChecked,
        List<SubmissionValidationIssueDto> errors,
        List<SubmissionValidationIssueDto> warnings,
        List<SubmissionStructureValidationSheetDto> sheetIssues
) {}
