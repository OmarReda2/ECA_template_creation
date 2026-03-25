package com.eca.submission.service;

import com.eca.submission.dto.SubmissionResolvedVersionDto;
import com.eca.submission.entity.SubmissionEntity;
import com.eca.submission.repository.SubmissionJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SubmissionPersistenceService {

    private static final String VALIDATED_STATUS = "VALIDATED";

    private final SubmissionJpaRepository submissionRepository;

    public SubmissionPersistenceService(SubmissionJpaRepository submissionRepository) {
        this.submissionRepository = submissionRepository;
    }

    @Transactional
    public UUID createValidatedSubmission(SubmissionResolvedVersionDto targetVersion, String originalFileName) {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setTemplateId(targetVersion.templateId());
        submission.setVersionId(targetVersion.versionId());
        submission.setSchemaHash(targetVersion.schemaHash());
        submission.setStatus(VALIDATED_STATUS);
        submission.setOriginalFileName(originalFileName);
        return submissionRepository.save(submission).getId();
    }
}
