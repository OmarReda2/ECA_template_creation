package com.eca.submission.dto;

import java.time.Instant;
import java.util.UUID;

public record SubmissionHistoryItemDto(
        UUID id,
        UUID templateId,
        UUID versionId,
        String schemaHash,
        String status,
        Instant createdAt,
        String originalFileName,
        String templateName,
        Integer versionNumber
) {
}
