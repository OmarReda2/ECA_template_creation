package com.eca.submission.dto;

import com.eca.submission.model.SubmissionIdentifyStatus;

import java.util.List;

public record SubmissionIdentifyResponse(
        SubmissionIdentifyStatus status,
        SubmissionMetadataDto metadata,
        SubmissionResolvedVersionDto resolvedVersion,
        List<String> messages
) {}
