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
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class SubmissionStructureValidationService {

    private static final String METADATA_SHEET_NAME = "__metadata__";
    private static final String VALIDATION_SHEET_NAME = "_validation";
    private static final String INSTRUCTIONS_SHEET_NAME = "Instructions";
    private static final String REQUIRED_HEADER_SUFFIX = " *";
    private static final String ERROR_SEVERITY = "ERROR";
    private static final String WARNING_SEVERITY = "WARNING";

    private static final List<DateTimeFormatter> TEXT_DATE_FORMATTERS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            DateTimeFormatter.ISO_OFFSET_DATE_TIME,
            DateTimeFormatter.ofPattern("d/M/uuuu"),
            DateTimeFormatter.ofPattern("dd/MM/uuuu"),
            DateTimeFormatter.ofPattern("M/d/uuuu"),
            DateTimeFormatter.ofPattern("MM/dd/uuuu")
    );

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
            return response(null, 0, 0, List.of(error(ex.getStatus().name(), null, null, null, ex.getMessage())), List.of(), List.of());
        }

        if (identifyResponse.status() != SubmissionIdentifyStatus.EXACT_MATCH || identifyResponse.resolvedVersion() == null) {
            return response(
                    identifyResponse.resolvedVersion(),
                    0,
                    0,
                    toErrorIssues(identifyResponse.status(), identifyResponse.messages()),
                    List.of(),
                    List.of()
            );
        }

        TemplateVersionEntity version = versionRepository.findById(identifyResponse.resolvedVersion().versionId()).orElse(null);
        if (version == null) {
            return response(
                    null,
                    0,
                    0,
                    List.of(error("VERSION_NOT_FOUND", null, null, null, "Resolved template version is no longer available for validation.")),
                    List.of(),
                    List.of()
            );
        }

        List<SheetSpec> expectedSheets = extractSheetSpecs(version.getSchemaJson());
        if (expectedSheets.isEmpty()) {
            return response(
                    identifyResponse.resolvedVersion(),
                    0,
                    0,
                    List.of(error("SCHEMA_TABLES_MISSING", null, null, null, "Resolved template version schema does not define business sheets.")),
                    toWarningIssues(identifyResponse.messages()),
                    List.of()
            );
        }

        try (Workbook workbook = workbookParser.openWorkbook(file)) {
            return validateWorkbookAgainstSchema(workbook, identifyResponse.resolvedVersion(), expectedSheets, identifyResponse.messages());
        } catch (SubmissionWorkbookException ex) {
            return response(
                    identifyResponse.resolvedVersion(),
                    0,
                    0,
                    List.of(error(ex.getStatus().name(), null, null, null, ex.getMessage())),
                    toWarningIssues(identifyResponse.messages()),
                    List.of()
            );
        } catch (IOException e) {
            return response(
                    identifyResponse.resolvedVersion(),
                    0,
                    0,
                    List.of(error("UNSUPPORTED_FILE", null, null, null, "The uploaded workbook could not be read.")),
                    toWarningIssues(identifyResponse.messages()),
                    List.of()
            );
        } catch (RuntimeException e) {
            return response(
                    identifyResponse.resolvedVersion(),
                    0,
                    0,
                    List.of(error("UNSUPPORTED_FILE", null, null, null, "The uploaded workbook is corrupt or unsupported.")),
                    toWarningIssues(identifyResponse.messages()),
                    List.of()
            );
        }
    }

    private SubmissionStructureValidationResponse validateWorkbookAgainstSchema(
            Workbook workbook,
            SubmissionResolvedVersionDto resolvedVersion,
            List<SheetSpec> expectedSheets,
            List<String> identifyMessages
    ) {
        List<SubmissionValidationIssueDto> errors = new ArrayList<>();
        List<SubmissionValidationIssueDto> warnings = new ArrayList<>(toWarningIssues(identifyMessages));
        List<SubmissionStructureValidationSheetDto> sheetIssues = new ArrayList<>();

        Set<String> expectedSheetNames = new LinkedHashSet<>();
        for (SheetSpec expectedSheet : expectedSheets) {
            expectedSheetNames.add(expectedSheet.sheetName());
        }

        for (String actualSheetName : getBusinessSheetNames(workbook)) {
            if (!expectedSheetNames.contains(actualSheetName)) {
                warnings.add(warning("EXTRA_SHEET", actualSheetName, null, null, "Unexpected sheet will be ignored."));
            }
        }

        List<ValidatedSheet> validatedSheets = new ArrayList<>();
        for (SheetSpec sheetSpec : expectedSheets) {
            Sheet actualSheet = workbook.getSheet(sheetSpec.sheetName());
            if (actualSheet == null) {
                errors.add(error("MISSING_SHEET", sheetSpec.sheetName(), null, null, "Expected sheet is missing."));
                sheetIssues.add(new SubmissionStructureValidationSheetDto(
                        sheetSpec.sheetName(),
                        sheetSpec.headers(),
                        List.of()
                ));
                continue;
            }

            HeaderInspection headerInspection = inspectHeaders(actualSheet, sheetSpec);
            errors.addAll(headerInspection.errors());
            warnings.addAll(headerInspection.warnings());
            if (!headerInspection.missingHeaders().isEmpty() || !headerInspection.extraHeaders().isEmpty()) {
                sheetIssues.add(new SubmissionStructureValidationSheetDto(
                        sheetSpec.sheetName(),
                        headerInspection.missingHeaders(),
                        headerInspection.extraHeaders()
                ));
            }

            if (headerInspection.missingHeaders().isEmpty()) {
                validatedSheets.add(new ValidatedSheet(actualSheet, sheetSpec, headerInspection.headerIndexByName()));
            }
        }

        if (!errors.isEmpty()) {
            return response(
                    resolvedVersion,
                    expectedSheets.size(),
                    0,
                    List.copyOf(errors),
                    List.copyOf(warnings),
                    List.copyOf(sheetIssues)
            );
        }

        int rowsChecked = 0;
        for (ValidatedSheet validatedSheet : validatedSheets) {
            rowsChecked += validateRows(validatedSheet, errors);
        }

        return response(
                resolvedVersion,
                expectedSheets.size(),
                rowsChecked,
                List.copyOf(errors),
                List.copyOf(warnings),
                List.copyOf(sheetIssues)
        );
    }

    private int validateRows(ValidatedSheet validatedSheet, List<SubmissionValidationIssueDto> errors) {
        int rowsChecked = 0;
        Sheet sheet = validatedSheet.sheet();
        int lastRow = sheet.getLastRowNum();
        for (int rowIndex = 1; rowIndex <= lastRow; rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null || isBlankBusinessRow(row, validatedSheet.headerIndexByName().values())) {
                continue;
            }

            rowsChecked++;
            int rowNumber = rowIndex + 1;
            for (FieldSpec fieldSpec : validatedSheet.sheetSpec().fields()) {
                Integer columnIndex = validatedSheet.headerIndexByName().get(fieldSpec.expectedHeader());
                if (columnIndex == null) {
                    continue;
                }
                Cell cell = row.getCell(columnIndex);
                String textValue = readCell(cell).trim();

                if (textValue.isEmpty()) {
                    if (fieldSpec.required()) {
                        errors.add(error("REQUIRED_VALUE_MISSING", validatedSheet.sheetSpec().sheetName(), rowNumber, fieldSpec.expectedHeader(), "Required value is missing."));
                    }
                    continue;
                }

                validateCellValue(validatedSheet.sheetSpec().sheetName(), rowNumber, fieldSpec, cell, textValue, errors);
            }
        }
        return rowsChecked;
    }

    private void validateCellValue(
            String sheetName,
            int rowNumber,
            FieldSpec fieldSpec,
            Cell cell,
            String textValue,
            List<SubmissionValidationIssueDto> errors
    ) {
        switch (fieldSpec.type()) {
            case "TEXT" -> validateTextRules(sheetName, rowNumber, fieldSpec, textValue, errors);
            case "NUMBER", "CURRENCY" -> validateNumericRules(sheetName, rowNumber, fieldSpec, cell, textValue, errors);
            case "DATE" -> validateDateRules(sheetName, rowNumber, fieldSpec, cell, textValue, errors);
            case "BOOLEAN" -> validateBooleanRules(sheetName, rowNumber, fieldSpec, cell, textValue, errors);
            default -> errors.add(error("UNSUPPORTED_FIELD_TYPE", sheetName, rowNumber, fieldSpec.expectedHeader(), "Field type '" + fieldSpec.type() + "' is not supported by submission validation."));
        }
    }

    private void validateTextRules(
            String sheetName,
            int rowNumber,
            FieldSpec fieldSpec,
            String textValue,
            List<SubmissionValidationIssueDto> errors
    ) {
        if (!fieldSpec.enumValues().isEmpty() && !fieldSpec.enumValues().contains(textValue)) {
            errors.add(error("INVALID_ENUM_VALUE", sheetName, rowNumber, fieldSpec.expectedHeader(), "Value is not in the allowed enum set."));
        }
    }

    private void validateNumericRules(
            String sheetName,
            int rowNumber,
            FieldSpec fieldSpec,
            Cell cell,
            String textValue,
            List<SubmissionValidationIssueDto> errors
    ) {
        BigDecimal value = parseNumericValue(cell, textValue);
        if (value == null) {
            errors.add(error("INVALID_TYPE", sheetName, rowNumber, fieldSpec.expectedHeader(), "Value must be a valid " + fieldSpec.type().toLowerCase(Locale.ROOT) + "."));
            return;
        }

        if (fieldSpec.minValue() != null && value.compareTo(fieldSpec.minValue()) < 0) {
            errors.add(error("VALUE_BELOW_MIN", sheetName, rowNumber, fieldSpec.expectedHeader(), "Value is below the configured minimum."));
        }
        if (fieldSpec.maxValue() != null && value.compareTo(fieldSpec.maxValue()) > 0) {
            errors.add(error("VALUE_ABOVE_MAX", sheetName, rowNumber, fieldSpec.expectedHeader(), "Value exceeds the configured maximum."));
        }
    }

    private void validateDateRules(
            String sheetName,
            int rowNumber,
            FieldSpec fieldSpec,
            Cell cell,
            String textValue,
            List<SubmissionValidationIssueDto> errors
    ) {
        if (!isValidDate(cell, textValue)) {
            errors.add(error("INVALID_TYPE", sheetName, rowNumber, fieldSpec.expectedHeader(), "Value must be a valid date."));
        }
    }

    private void validateBooleanRules(
            String sheetName,
            int rowNumber,
            FieldSpec fieldSpec,
            Cell cell,
            String textValue,
            List<SubmissionValidationIssueDto> errors
    ) {
        if (!isValidBoolean(cell, textValue)) {
            errors.add(error("INVALID_TYPE", sheetName, rowNumber, fieldSpec.expectedHeader(), "Value must be a valid boolean."));
        }
    }

    private List<SheetSpec> extractSheetSpecs(JsonNode schemaJson) {
        if (schemaJson == null || !schemaJson.isObject()) {
            return List.of();
        }
        JsonNode tables = schemaJson.get("tables");
        if (tables == null || !tables.isArray()) {
            return List.of();
        }

        List<SheetSpec> expectedSheets = new ArrayList<>();
        for (JsonNode table : tables) {
            if (!table.isObject()) {
                continue;
            }
            String sheetName = textValue(table.get("sheetName"));
            if (sheetName == null) {
                continue;
            }

            JsonNode fieldsNode = table.get("fields");
            List<FieldSpec> fields = new ArrayList<>();
            if (fieldsNode != null && fieldsNode.isArray()) {
                for (JsonNode fieldNode : fieldsNode) {
                    if (!fieldNode.isObject()) {
                        continue;
                    }
                    FieldSpec fieldSpec = toFieldSpec(fieldNode);
                    if (fieldSpec != null) {
                        fields.add(fieldSpec);
                    }
                }
            }

            expectedSheets.add(new SheetSpec(sheetName, List.copyOf(fields)));
        }
        return List.copyOf(expectedSheets);
    }

    private FieldSpec toFieldSpec(JsonNode fieldNode) {
        String headerName = textValue(fieldNode.get("headerName"));
        String type = textValue(fieldNode.get("type"));
        if (headerName == null || type == null) {
            return null;
        }

        boolean required = fieldNode.has("required") && fieldNode.get("required").asBoolean(false);
        JsonNode validations = fieldNode.get("validations");
        List<String> enumValues = readEnumValues(validations);
        BigDecimal minValue = readDecimal(validations, "min");
        BigDecimal maxValue = readDecimal(validations, "max");

        return new FieldSpec(
                headerName,
                required ? headerName + REQUIRED_HEADER_SUFFIX : headerName,
                required,
                type.trim().toUpperCase(Locale.ROOT),
                enumValues,
                minValue,
                maxValue
        );
    }

    private HeaderInspection inspectHeaders(Sheet sheet, SheetSpec sheetSpec) {
        Map<String, Integer> actualHeaderIndexByName = readHeaderIndexByName(sheet);
        List<SubmissionValidationIssueDto> errors = new ArrayList<>();
        List<SubmissionValidationIssueDto> warnings = new ArrayList<>();
        List<String> missingHeaders = new ArrayList<>();

        for (FieldSpec field : sheetSpec.fields()) {
            if (!actualHeaderIndexByName.containsKey(field.expectedHeader())) {
                missingHeaders.add(field.expectedHeader());
                errors.add(error("MISSING_HEADER", sheetSpec.sheetName(), null, field.expectedHeader(), "Required header is missing."));
            }
        }

        Set<String> expectedHeaders = new LinkedHashSet<>(sheetSpec.headers());
        List<String> extraHeaders = new ArrayList<>();
        for (String actualHeader : actualHeaderIndexByName.keySet()) {
            if (!expectedHeaders.contains(actualHeader)) {
                extraHeaders.add(actualHeader);
                warnings.add(warning("EXTRA_HEADER", sheetSpec.sheetName(), null, actualHeader, "Unexpected header will be ignored."));
            }
        }

        return new HeaderInspection(
                Map.copyOf(actualHeaderIndexByName),
                List.copyOf(missingHeaders),
                List.copyOf(extraHeaders),
                List.copyOf(errors),
                List.copyOf(warnings)
        );
    }

    private Map<String, Integer> readHeaderIndexByName(Sheet sheet) {
        Map<String, Integer> headers = new LinkedHashMap<>();
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
                headers.put(value.trim(), i);
            }
        }
        return headers;
    }

    private Set<String> getBusinessSheetNames(Workbook workbook) {
        Set<String> sheetNames = new LinkedHashSet<>();
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            String sheetName = workbook.getSheetAt(i).getSheetName();
            if (!isIgnoredSheet(sheetName)) {
                sheetNames.add(sheetName);
            }
        }
        return sheetNames;
    }

    private boolean isIgnoredSheet(String sheetName) {
        return METADATA_SHEET_NAME.equals(sheetName)
                || VALIDATION_SHEET_NAME.equals(sheetName)
                || INSTRUCTIONS_SHEET_NAME.equals(sheetName);
    }

    private boolean isBlankBusinessRow(Row row, Iterable<Integer> relevantColumnIndexes) {
        for (Integer columnIndex : relevantColumnIndexes) {
            if (columnIndex == null) {
                continue;
            }
            String value = readCell(row.getCell(columnIndex));
            if (!value.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private List<String> readEnumValues(JsonNode validations) {
        if (validations == null || !validations.isObject()) {
            return List.of();
        }

        JsonNode enumNode = validations.has("enumValues") ? validations.get("enumValues") : validations.get("enum");
        if (enumNode == null || !enumNode.isArray()) {
            return List.of();
        }

        List<String> values = new ArrayList<>();
        for (JsonNode valueNode : enumNode) {
            String value = textValue(valueNode);
            if (value != null) {
                values.add(value);
            }
        }
        return List.copyOf(values);
    }

    private BigDecimal readDecimal(JsonNode validations, String fieldName) {
        if (validations == null || !validations.isObject()) {
            return null;
        }
        JsonNode valueNode = validations.get(fieldName);
        if (valueNode == null || !valueNode.isNumber()) {
            return null;
        }
        return valueNode.decimalValue();
    }

    private BigDecimal parseNumericValue(Cell cell, String textValue) {
        if (cell != null && cell.getCellType() == CellType.NUMERIC && !DateUtil.isCellDateFormatted(cell)) {
            return BigDecimal.valueOf(cell.getNumericCellValue());
        }
        try {
            return new BigDecimal(textValue);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean isValidDate(Cell cell, String textValue) {
        if (cell != null) {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                return true;
            }
            if (cell.getCellType() == CellType.STRING) {
                return parseTextDate(textValue);
            }
        }
        return parseTextDate(textValue);
    }

    private boolean parseTextDate(String textValue) {
        for (DateTimeFormatter formatter : TEXT_DATE_FORMATTERS) {
            try {
                if (formatter == DateTimeFormatter.ISO_LOCAL_DATE) {
                    LocalDate.parse(textValue, formatter);
                } else if (formatter == DateTimeFormatter.ISO_OFFSET_DATE_TIME) {
                    OffsetDateTime.parse(textValue, formatter);
                } else {
                    LocalDateTime.parse(textValue, formatter);
                }
                return true;
            } catch (DateTimeParseException ignored) {
                try {
                    LocalDate.parse(textValue, formatter);
                    return true;
                } catch (DateTimeParseException ignoredAgain) {
                    // try next formatter
                }
            }
        }
        return false;
    }

    private boolean isValidBoolean(Cell cell, String textValue) {
        if (cell != null && cell.getCellType() == CellType.BOOLEAN) {
            return true;
        }
        String normalized = textValue.trim().toLowerCase(Locale.ROOT);
        return normalized.equals("yes")
                || normalized.equals("no")
                || normalized.equals("true")
                || normalized.equals("false");
    }

    private List<SubmissionValidationIssueDto> toErrorIssues(SubmissionIdentifyStatus status, List<String> messages) {
        List<String> safeMessages = (messages == null || messages.isEmpty())
                ? List.of(defaultMessageForStatus(status))
                : messages;
        List<SubmissionValidationIssueDto> issues = new ArrayList<>();
        for (String message : safeMessages) {
            issues.add(error(status.name(), null, null, null, message));
        }
        return List.copyOf(issues);
    }

    private List<SubmissionValidationIssueDto> toWarningIssues(List<String> messages) {
        if (messages == null || messages.isEmpty()) {
            return List.of();
        }
        List<SubmissionValidationIssueDto> issues = new ArrayList<>();
        for (String message : messages) {
            issues.add(warning("IDENTITY_WARNING", null, null, null, message));
        }
        return List.copyOf(issues);
    }

    private String defaultMessageForStatus(SubmissionIdentifyStatus status) {
        return switch (status) {
            case METADATA_MISSING -> "Workbook metadata sheet '__metadata__' was not found.";
            case METADATA_INVALID -> "Workbook metadata is invalid for workbook validation.";
            case VERSION_NOT_FOUND -> "No template version exists for the uploaded workbook metadata.";
            case HASH_MISMATCH -> "Uploaded schema_hash does not match the resolved version.";
            case UNSUPPORTED_FILE -> "The uploaded workbook is corrupt or unsupported.";
            case EXACT_MATCH -> "Workbook identity resolved successfully.";
        };
    }

    private SubmissionValidationIssueDto error(String code, String sheetName, Integer rowNumber, String headerName, String message) {
        return new SubmissionValidationIssueDto(ERROR_SEVERITY, code, sheetName, rowNumber, headerName, message);
    }

    private SubmissionValidationIssueDto warning(String code, String sheetName, Integer rowNumber, String headerName, String message) {
        return new SubmissionValidationIssueDto(WARNING_SEVERITY, code, sheetName, rowNumber, headerName, message);
    }

    private SubmissionStructureValidationResponse response(
            SubmissionResolvedVersionDto targetVersion,
            int sheetsChecked,
            int rowsChecked,
            List<SubmissionValidationIssueDto> errors,
            List<SubmissionValidationIssueDto> warnings,
            List<SubmissionStructureValidationSheetDto> sheetIssues
    ) {
        return new SubmissionStructureValidationResponse(targetVersion, sheetsChecked, rowsChecked, errors, warnings, sheetIssues);
    }

    private String readCell(Cell cell) {
        return cell == null ? "" : dataFormatter.formatCellValue(cell);
    }

    private String textValue(JsonNode node) {
        if (node == null || !node.isTextual()) {
            return null;
        }
        String value = node.asText().trim();
        return value.isEmpty() ? null : value;
    }

    private record SheetSpec(String sheetName, List<FieldSpec> fields) {
        private List<String> headers() {
            List<String> headers = new ArrayList<>();
            for (FieldSpec field : fields) {
                headers.add(field.expectedHeader());
            }
            return List.copyOf(headers);
        }
    }

    private record FieldSpec(
            String headerName,
            String expectedHeader,
            boolean required,
            String type,
            List<String> enumValues,
            BigDecimal minValue,
            BigDecimal maxValue
    ) {
    }

    private record HeaderInspection(
            Map<String, Integer> headerIndexByName,
            List<String> missingHeaders,
            List<String> extraHeaders,
            List<SubmissionValidationIssueDto> errors,
            List<SubmissionValidationIssueDto> warnings
    ) {
    }

    private record ValidatedSheet(
            Sheet sheet,
            SheetSpec sheetSpec,
            Map<String, Integer> headerIndexByName
    ) {
    }
}
