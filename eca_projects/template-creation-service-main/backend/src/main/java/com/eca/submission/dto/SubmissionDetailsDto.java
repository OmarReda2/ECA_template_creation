package com.eca.submission.dto;

import java.time.Instant;
import java.util.UUID;

public record SubmissionDetailsDto(
        UUID id,
        UUID templateId,
        String templateName,
        UUID versionId,
        Integer versionNumber,
        String schemaHash,
        String status,
        Instant createdAt,
        String originalFileName
) {
}
