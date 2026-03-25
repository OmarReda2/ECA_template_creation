package com.eca.submission.service;

import com.eca.submission.dto.SubmissionHistoryItemDto;
import com.eca.submission.entity.SubmissionEntity;
import com.eca.submission.repository.SubmissionJpaRepository;
import com.eca.template.entity.TemplateVersionEntity;
import com.eca.template.repository.TemplateVersionJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SubmissionHistoryService {

    private final SubmissionJpaRepository submissionRepository;
    private final TemplateVersionJpaRepository versionRepository;

    public SubmissionHistoryService(
            SubmissionJpaRepository submissionRepository,
            TemplateVersionJpaRepository versionRepository
    ) {
        this.submissionRepository = submissionRepository;
        this.versionRepository = versionRepository;
    }

    @Transactional(readOnly = true)
    public List<SubmissionHistoryItemDto> listSubmissions() {
        List<SubmissionEntity> submissions = submissionRepository.findAllByOrderByCreatedAtDesc();
        Map<UUID, TemplateVersionEntity> versionsById = loadVersions(submissions);

        return submissions.stream()
                .map(submission -> toDto(submission, versionsById.get(submission.getVersionId())))
                .toList();
    }

    private Map<UUID, TemplateVersionEntity> loadVersions(List<SubmissionEntity> submissions) {
        List<UUID> versionIds = submissions.stream()
                .map(SubmissionEntity::getVersionId)
                .distinct()
                .toList();

        Map<UUID, TemplateVersionEntity> versionsById = new HashMap<>();
        versionRepository.findAllById(versionIds)
                .forEach(version -> versionsById.put(version.getId(), version));
        return versionsById;
    }

    private SubmissionHistoryItemDto toDto(SubmissionEntity submission, TemplateVersionEntity version) {
        String templateName = null;
        Integer versionNumber = null;

        if (version != null) {
            versionNumber = version.getVersionNumber();
            if (version.getTemplate() != null) {
                templateName = version.getTemplate().getName();
            }
        }

        return new SubmissionHistoryItemDto(
                submission.getId(),
                submission.getTemplateId(),
                submission.getVersionId(),
                submission.getSchemaHash(),
                submission.getStatus(),
                submission.getCreatedAt(),
                submission.getOriginalFileName(),
                templateName,
                versionNumber
        );
    }
}
