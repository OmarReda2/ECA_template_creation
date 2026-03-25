package com.eca.template.submission.dto;

import java.util.UUID;

public record SubmissionResolvedVersionDto(
        UUID templateId,
        String templateName,
        UUID versionId,
        Integer versionNumber,
        String schemaHash
) {}
