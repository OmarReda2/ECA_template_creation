package com.eca.template.submission.dto;

public record SubmissionMetadataDto(
        String templateId,
        String versionId,
        String versionNumber,
        String schemaHash,
        String generatedAt,
        String generatorVersion
) {}
