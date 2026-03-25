package com.eca.submission.service;

import com.eca.submission.dto.SubmissionIdentifyResponse;
import com.eca.submission.dto.SubmissionResolvedVersionDto;
import com.eca.submission.dto.SubmissionStructureValidationResponse;
import com.eca.submission.dto.SubmissionStructureValidationSheetDto;
import com.eca.submission.dto.SubmissionValidationIssueDto;
import com.eca.submission.exception.SubmissionWorkbookException;
import com.eca.submission.model.SubmissionIdentifyStatus;
import com.eca.submission.parser.SubmissionWorkbookParser;
import com.eca.template.entity.TemplateVersionEntity;
import com.eca.template.repository.TemplateVersionJpaRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class SubmissionStructureValidationService {

    private static final String METADATA_SHEET_NAME = "__metadata__";
    private static final String VALIDATION_SHEET_NAME = "_validation";
    private static final String INSTRUCTIONS_SHEET_NAME = "Instructions";
    private static final String REQUIRED_HEADER_SUFFIX = " *";

    private final SubmissionService submissionService;
    private final SubmissionWorkbookParser workbookParser;
    private final TemplateVersionJpaRepository versionRepository;
    private final DataFormatter dataFormatter = new DataFormatter(Locale.ROOT);

    public SubmissionStructureValidationService(
            SubmissionService submissionService,
            SubmissionWorkbookParser workbookParser,
            TemplateVersionJpaRepository versionRepository
    ) {
        this.submissionService = submissionService;
        this.workbookParser = workbookParser;
        this.versionRepository = versionRepository;
    }

    @Transactional(readOnly = true)
    public SubmissionStructureValidationResponse validateStructure(MultipartFile file) {
        SubmissionIdentifyResponse identifyResponse;
        try {
            identifyResponse = submissionService.identify(file);
        } catch (SubmissionWorkbookException ex) {
            return response(null, 0, List.of(issue(ex.getStatus().name(), null, null, ex.getMessage())), List.of(), List.of());
        }

        if (identifyResponse.status() != SubmissionIdentifyStatus.EXACT_MATCH || identifyResponse.resolvedVersion() == null) {
            return response(
                    identifyResponse.resolvedVersion(),
                    0,
                    toValidationIssues(identifyResponse.status(), identifyResponse.messages()),
                    List.of(),
                    List.of()
            );
        }

        TemplateVersionEntity version = versionRepository.findById(identifyResponse.resolvedVersion().versionId()).orElse(null);
        if (version == null) {
            return response(
                    null,
                    0,
                    List.of(issue("VERSION_NOT_FOUND", null, null, "Resolved template version is no longer available for validation.")),
                    List.of(),
                    List.of()
            );
        }

        List<ExpectedSheet> expectedSheets = extractExpectedSheets(version.getSchemaJson());
        if (expectedSheets.isEmpty()) {
            return response(
                    identifyResponse.resolvedVersion(),
                    0,
                    List.of(issue("SCHEMA_TABLES_MISSING", null, null, "Resolved template version schema does not define business sheets.")),
                    List.of(),
                    List.of()
            );
        }

        try (Workbook workbook = workbookParser.openWorkbook(file)) {
            return validateWorkbookAgainstSchema(workbook, identifyResponse.resolvedVersion(), expectedSheets);
        } catch (SubmissionWorkbookException ex) {
            return response(
                    identifyResponse.resolvedVersion(),
                    0,
                    List.of(issue(ex.getStatus().name(), null, null, ex.getMessage())),
                    List.of(),
                    List.of()
            );
        } catch (IOException e) {
            return response(
                    identifyResponse.resolvedVersion(),
                    0,
                    List.of(issue("UNSUPPORTED_FILE", null, null, "The uploaded workbook could not be read.")),
                    List.of(),
                    List.of()
            );
        } catch (RuntimeException e) {
            return response(
                    identifyResponse.resolvedVersion(),
                    0,
                    List.of(issue("UNSUPPORTED_FILE", null, null, "The uploaded workbook is corrupt or unsupported.")),
                    List.of(),
                    List.of()
            );
        }
    }

    private SubmissionStructureValidationResponse validateWorkbookAgainstSchema(
            Workbook workbook,
            SubmissionResolvedVersionDto resolvedVersion,
            List<ExpectedSheet> expectedSheets
    ) {
        List<SubmissionValidationIssueDto> errors = new ArrayList<>();
        List<SubmissionValidationIssueDto> warnings = new ArrayList<>();
        List<SubmissionStructureValidationSheetDto> sheetIssues = new ArrayList<>();

        Set<String> expectedSheetNames = new LinkedHashSet<>();
        for (ExpectedSheet expectedSheet : expectedSheets) {
            expectedSheetNames.add(expectedSheet.sheetName());
        }

        for (String actualSheetName : getBusinessSheetNames(workbook)) {
            if (!expectedSheetNames.contains(actualSheetName)) {
                warnings.add(issue("EXTRA_SHEET", actualSheetName, null, "Unexpected sheet will be ignored."));
            }
        }

        for (ExpectedSheet expectedSheet : expectedSheets) {
            Sheet actualSheet = workbook.getSheet(expectedSheet.sheetName());
            if (actualSheet == null) {
                errors.add(issue("MISSING_SHEET", expectedSheet.sheetName(), null, "Expected sheet is missing."));
                sheetIssues.add(new SubmissionStructureValidationSheetDto(
                        expectedSheet.sheetName(),
                        List.copyOf(expectedSheet.headers()),
                        List.of()
                ));
                continue;
            }

            Set<String> actualHeaders = readHeaders(actualSheet);
            List<String> missingHeaders = new ArrayList<>();
            for (String expectedHeader : expectedSheet.headers()) {
                if (!actualHeaders.contains(expectedHeader)) {
                    missingHeaders.add(expectedHeader);
                    errors.add(issue("MISSING_HEADER", expectedSheet.sheetName(), expectedHeader, "Required header is missing."));
                }
            }

            List<String> extraHeaders = new ArrayList<>();
            for (String actualHeader : actualHeaders) {
                if (!expectedSheet.headers().contains(actualHeader)) {
                    extraHeaders.add(actualHeader);
                    warnings.add(issue("EXTRA_HEADER", expectedSheet.sheetName(), actualHeader, "Unexpected header will be ignored."));
                }
            }

            if (!missingHeaders.isEmpty() || !extraHeaders.isEmpty()) {
                sheetIssues.add(new SubmissionStructureValidationSheetDto(
                        expectedSheet.sheetName(),
                        List.copyOf(missingHeaders),
                        List.copyOf(extraHeaders)
                ));
            }
        }

        return response(resolvedVersion, expectedSheets.size(), List.copyOf(errors), List.copyOf(warnings), List.copyOf(sheetIssues));
    }

    private List<ExpectedSheet> extractExpectedSheets(JsonNode schemaJson) {
        if (schemaJson == null || !schemaJson.isObject()) {
            return List.of();
        }
        JsonNode tables = schemaJson.get("tables");
        if (tables == null || !tables.isArray()) {
            return List.of();
        }

        List<ExpectedSheet> expectedSheets = new ArrayList<>();
        for (JsonNode table : tables) {
            if (!table.isObject()) {
                continue;
            }
            String sheetName = textValue(table.get("sheetName"));
            if (sheetName == null) {
                continue;
            }

            JsonNode fields = table.get("fields");
            List<String> headers = new ArrayList<>();
            if (fields != null && fields.isArray()) {
                for (JsonNode field : fields) {
                    if (!field.isObject()) {
                        continue;
                    }
                    String headerName = textValue(field.get("headerName"));
                    if (headerName == null) {
                        continue;
                    }
                    boolean required = field.has("required") && field.get("required").asBoolean(false);
                    headers.add(required ? headerName + REQUIRED_HEADER_SUFFIX : headerName);
                }
            }
            expectedSheets.add(new ExpectedSheet(sheetName, List.copyOf(headers)));
        }
        return List.copyOf(expectedSheets);
    }

    private Set<String> getBusinessSheetNames(Workbook workbook) {
        Set<String> sheetNames = new LinkedHashSet<>();
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            String sheetName = workbook.getSheetAt(i).getSheetName();
            if (isIgnoredSheet(sheetName)) {
                continue;
            }
            sheetNames.add(sheetName);
        }
        return sheetNames;
    }

    private boolean isIgnoredSheet(String sheetName) {
        return METADATA_SHEET_NAME.equals(sheetName)
                || VALIDATION_SHEET_NAME.equals(sheetName)
                || INSTRUCTIONS_SHEET_NAME.equals(sheetName);
    }

    private Set<String> readHeaders(Sheet sheet) {
        Set<String> headers = new LinkedHashSet<>();
        Row headerRow = sheet.getRow(0);
        if (headerRow == null) {
            return headers;
        }

        short lastCellNum = headerRow.getLastCellNum();
        if (lastCellNum < 0) {
            return headers;
        }

        for (int i = 0; i < lastCellNum; i++) {
            String value = readCell(headerRow.getCell(i));
            if (!value.isBlank()) {
                headers.add(value.trim());
            }
        }
        return headers;
    }

    private List<SubmissionValidationIssueDto> toValidationIssues(SubmissionIdentifyStatus status, List<String> messages) {
        List<String> safeMessages = (messages == null || messages.isEmpty())
                ? List.of(defaultMessageForStatus(status))
                : messages;
        List<SubmissionValidationIssueDto> issues = new ArrayList<>();
        for (String message : safeMessages) {
            issues.add(issue(status.name(), null, null, message));
        }
        return List.copyOf(issues);
    }

    private String defaultMessageForStatus(SubmissionIdentifyStatus status) {
        return switch (status) {
            case METADATA_MISSING -> "Workbook metadata sheet '__metadata__' was not found.";
            case METADATA_INVALID -> "Workbook metadata is invalid for structure validation.";
            case VERSION_NOT_FOUND -> "No template version exists for the uploaded workbook metadata.";
            case HASH_MISMATCH -> "Uploaded schema_hash does not match the resolved version.";
            case UNSUPPORTED_FILE -> "The uploaded workbook is corrupt or unsupported.";
            case EXACT_MATCH -> "Workbook identity resolved successfully.";
        };
    }

    private SubmissionValidationIssueDto issue(String code, String sheetName, String headerName, String message) {
        return new SubmissionValidationIssueDto(code, sheetName, headerName, message);
    }

    private SubmissionStructureValidationResponse response(
            SubmissionResolvedVersionDto targetVersion,
            int sheetsChecked,
            List<SubmissionValidationIssueDto> errors,
            List<SubmissionValidationIssueDto> warnings,
            List<SubmissionStructureValidationSheetDto> sheetIssues
    ) {
        return new SubmissionStructureValidationResponse(targetVersion, sheetsChecked, errors, warnings, sheetIssues);
    }

    private String textValue(JsonNode node) {
        if (node == null || !node.isTextual()) {
            return null;
        }
        String value = node.asText().trim();
        return value.isEmpty() ? null : value;
    }

    private String readCell(Cell cell) {
        return cell == null ? "" : dataFormatter.formatCellValue(cell);
    }

    private record ExpectedSheet(String sheetName, List<String> headers) {
    }
}
