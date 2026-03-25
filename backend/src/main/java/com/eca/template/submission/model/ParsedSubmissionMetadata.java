package com.eca.template.submission.model;

public record ParsedSubmissionMetadata(
        String templateId,
        String versionId,
        String versionNumber,
        String schemaHash,
        String generatedAt,
        String generatorVersion
) {}
