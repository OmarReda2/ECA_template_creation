package com.eca.submission.service;

import com.eca.template.entity.TemplateVersionEntity;
import com.eca.template.repository.TemplateVersionJpaRepository;
import com.eca.submission.dto.SubmissionIdentifyResponse;
import com.eca.submission.dto.SubmissionMetadataDto;
import com.eca.submission.dto.SubmissionResolvedVersionDto;
import com.eca.submission.model.ParsedSubmissionMetadata;
import com.eca.submission.model.SubmissionIdentifyStatus;
import com.eca.submission.parser.SubmissionWorkbookParser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SubmissionService {

    private static final String PENDING_HASH = "PENDING_HASH";

    private final SubmissionWorkbookParser workbookParser;
    private final TemplateVersionJpaRepository versionRepository;

    public SubmissionService(SubmissionWorkbookParser workbookParser, TemplateVersionJpaRepository versionRepository) {
        this.workbookParser = workbookParser;
        this.versionRepository = versionRepository;
    }

    @Transactional(readOnly = true)
    public SubmissionIdentifyResponse identify(MultipartFile file) {
        ParsedSubmissionMetadata metadata = workbookParser.parse(file);
        SubmissionMetadataDto metadataDto = toMetadataDto(metadata);

        if (metadata.versionId() == null
                && metadata.templateId() == null
                && metadata.versionNumber() == null
                && metadata.schemaHash() == null) {
            return new SubmissionIdentifyResponse(
                    SubmissionIdentifyStatus.METADATA_MISSING,
                    metadataDto,
                    null,
                    List.of("Workbook metadata sheet '__metadata__' was not found.")
            );
        }

        List<String> messages = new ArrayList<>();
        Optional<UUID> versionId = parseRequiredUuid(
                metadata.versionId(),
                "Metadata field 'version_id' is missing or invalid.",
                messages
        );
        validateOptionalUuid(
                metadata.templateId(),
                "Metadata field 'template_id' is invalid and will be treated as advisory only.",
                messages
        );
        validateOptionalInteger(
                metadata.versionNumber(),
                "Metadata field 'version_number' is invalid and will be treated as advisory only.",
                messages
        );
        validateRequiredText(
                metadata.schemaHash(),
                "Metadata field 'schema_hash' is missing or blank.",
                messages
        );

        if (versionId.isEmpty() || isMissingRequiredHash(metadata.schemaHash())) {
            return new SubmissionIdentifyResponse(
                    SubmissionIdentifyStatus.METADATA_INVALID,
                    metadataDto,
                    null,
                    List.copyOf(messages)
            );
        }

        TemplateVersionEntity version = versionRepository.findById(versionId.get()).orElse(null);
        if (version == null) {
            return new SubmissionIdentifyResponse(
                    SubmissionIdentifyStatus.VERSION_NOT_FOUND,
                    metadataDto,
                    null,
                    List.of("No template version exists for the uploaded workbook metadata.")
            );
        }

        SubmissionResolvedVersionDto resolvedVersion = new SubmissionResolvedVersionDto(
                version.getTemplate().getId(),
                version.getTemplate().getName(),
                version.getId(),
                version.getVersionNumber(),
                version.getSchemaHash()
        );

        if (isPendingHash(metadata.schemaHash()) || isPendingHash(version.getSchemaHash())) {
            messages.add("Schema hash comparison is based on a non-final 'PENDING_HASH' value.");
        }

        if (!version.getSchemaHash().equals(metadata.schemaHash())) {
            if (metadata.templateId() != null && !version.getTemplate().getId().toString().equals(metadata.templateId())) {
                messages.add("Metadata template_id does not match the resolved version's template.");
            }
            if (metadata.versionNumber() != null && !String.valueOf(version.getVersionNumber()).equals(metadata.versionNumber())) {
                messages.add("Metadata version_number does not match the resolved version.");
            }
            messages.add("Uploaded schema_hash does not match the resolved version.");
            return new SubmissionIdentifyResponse(
                    SubmissionIdentifyStatus.HASH_MISMATCH,
                    metadataDto,
                    resolvedVersion,
                    List.copyOf(messages)
            );
        }

        if (metadata.templateId() != null && !version.getTemplate().getId().toString().equals(metadata.templateId())) {
            messages.add("Metadata template_id does not match the resolved version's template.");
        }
        if (metadata.versionNumber() != null && !String.valueOf(version.getVersionNumber()).equals(metadata.versionNumber())) {
            messages.add("Metadata version_number does not match the resolved version.");
        }

        return new SubmissionIdentifyResponse(
                SubmissionIdentifyStatus.EXACT_MATCH,
                metadataDto,
                resolvedVersion,
                List.copyOf(messages)
        );
    }

    private SubmissionMetadataDto toMetadataDto(ParsedSubmissionMetadata metadata) {
        return new SubmissionMetadataDto(
                metadata.templateId(),
                metadata.versionId(),
                metadata.versionNumber(),
                metadata.schemaHash(),
                metadata.generatedAt(),
                metadata.generatorVersion()
        );
    }

    private Optional<UUID> parseRequiredUuid(String value, String message, List<String> messages) {
        if (value == null) {
            messages.add(message);
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException e) {
            messages.add(message);
            return Optional.empty();
        }
    }

    private void validateOptionalUuid(String value, String message, List<String> messages) {
        if (value == null) {
            return;
        }
        try {
            UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            messages.add(message);
        }
    }

    private void validateOptionalInteger(String value, String message, List<String> messages) {
        if (value == null) {
            return;
        }
        try {
            Integer.parseInt(value);
        } catch (NumberFormatException e) {
            messages.add(message);
        }
    }

    private void validateRequiredText(String value, String message, List<String> messages) {
        if (value == null || value.isBlank()) {
            messages.add(message);
        }
    }

    private boolean isPendingHash(String value) {
        return PENDING_HASH.equals(value);
    }

    private boolean isMissingRequiredHash(String value) {
        return value == null || value.isBlank();
    }
}
