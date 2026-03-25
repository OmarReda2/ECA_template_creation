package com.eca.template.submission.dto;

import com.eca.template.submission.model.SubmissionIdentifyStatus;

import java.util.List;

public record SubmissionIdentifyResponse(
        SubmissionIdentifyStatus status,
        SubmissionMetadataDto metadata,
        SubmissionResolvedVersionDto resolvedVersion,
        List<String> messages
) {}
