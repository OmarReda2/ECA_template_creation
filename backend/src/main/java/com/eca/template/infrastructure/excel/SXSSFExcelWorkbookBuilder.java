package com.eca.template.infrastructure.excel;

import com.fasterxml.jackson.databind.JsonNode;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.apache.poi.xssf.usermodel.XSSFDataValidation;

import java.io.IOException;
import java.io.OutputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

/**
 * POI SXSSF implementation of ExcelWorkbookBuilder.
 * Always applies light blue header style and freeze first row.
 * Optional: instructions sheet, validation rules, sheet protection.
 */
@Component
public class SXSSFExcelWorkbookBuilder implements ExcelWorkbookBuilder {

    private static final Logger log = LoggerFactory.getLogger(SXSSFExcelWorkbookBuilder.class);

    private static final String METADATA_SHEET_NAME = "__metadata__";
    private static final String INSTRUCTIONS_SHEET_NAME = "Instructions";
    private static final String VALIDATION_SHEET_NAME = "_validation";
    private static final int VALIDATION_ROW_END = 1000;
    private static final int PROTECTION_DATA_ROW_END = 1000;
    /** Excel width units for data-sheet columns (~30 character units; POI uses 1/256th). */
    private static final int DATA_SHEET_COLUMN_WIDTH = 30 * 256;
    private static final String GENERATOR_VERSION = "template-service/0.1";
    private static final String REQUIRED_HEADER_SUFFIX = " *";

    /**
     * Single source for reading enum values from a field's validations.
     * Prefers validations.enumValues, fallback validations.enum; trims, removes blanks, deduplicates, preserves order.
     */
    private static List<String> getEnumValues(JsonNode field) {
        JsonNode v = field.get("validations");
        if (v == null || !v.isObject()) return List.of();
        JsonNode arr = v.has("enumValues") && v.get("enumValues").isArray()
                ? v.get("enumValues")
                : (v.has("enum") && v.get("enum").isArray() ? v.get("enum") : null);
        if (arr == null) return List.of();
        List<String> out = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (JsonNode n : arr) {
            if (!n.isTextual()) continue;
            String s = n.asText().trim();
            if (s.isEmpty()) continue;
            if (seen.add(s)) out.add(s);
        }
        return out;
    }

    /** 0-based column index to Excel column letter(s), e.g. 0 -> A, 26 -> AA. */
    private static String columnIndexToLetter(int columnIndex) {
        StringBuilder sb = new StringBuilder();
        int n = columnIndex;
        do {
            sb.insert(0, (char) ('A' + (n % 26)));
            n = n / 26 - 1;
        } while (n >= 0);
        return sb.toString();
    }

    private static String getTableKey(JsonNode table) {
        if (table.has("tableKey") && table.get("tableKey").isTextual()) {
            return table.get("tableKey").asText().trim();
        }
        return getSheetName(table);
    }

    private static String getFieldKey(JsonNode field) {
        return field.has("fieldKey") && field.get("fieldKey").isTextual()
                ? field.get("fieldKey").asText().trim()
                : "";
    }

    /** One column in _validation sheet: key + list of enum values. */
    private static final class EnumSlot {
        final String tableKey;
        final String fieldKey;
        final List<String> values;

        EnumSlot(String tableKey, String fieldKey, List<String> values) {
            this.tableKey = tableKey;
            this.fieldKey = fieldKey;
            this.values = List.copyOf(values);
        }
    }

    private static List<EnumSlot> collectEnumSlots(JsonNode tables) {
        List<EnumSlot> slots = new ArrayList<>();
        for (JsonNode table : tables) {
            String tableKey = getTableKey(table);
            JsonNode fields = table.get("fields");
            if (fields == null || !fields.isArray()) continue;
            for (JsonNode field : fields) {
                String type = field.has("type") && field.get("type").isTextual()
                        ? field.get("type").asText().trim().toUpperCase()
                        : "";
                if (!"TEXT".equals(type)) continue;
                List<String> values = getEnumValues(field);
                if (values.isEmpty()) continue;
                String fieldKey = getFieldKey(field);
                slots.add(new EnumSlot(tableKey, fieldKey, values));
            }
        }
        return slots;
    }

    @Override
    public void writeWorkbook(
            JsonNode schemaJson,
            String templateName,
            UUID templateId,
            UUID versionId,
            int versionNumber,
            String schemaHash,
            ExportOptions options,
            OutputStream outputStream) {
        if (options == null) {
            options = ExportOptions.defaults();
        }
        SXSSFWorkbook workbook = new SXSSFWorkbook(SXSSFWorkbook.DEFAULT_WINDOW_SIZE);
        try {
            JsonNode tables = schemaJson != null ? schemaJson.get("tables") : null;

            if (tables != null && tables.isArray()) {
                Map<String, int[]> validationSlotMap = new TreeMap<>();
                String validationSheetName = null;
                List<EnumSlot> enumSlots = collectEnumSlots(tables);
                if (!enumSlots.isEmpty()) {
                    EnumSlot first = enumSlots.get(0);
                    log.info("Export schema enum proof: tableKey={} fieldKey={} type=TEXT enumValues={}",
                            first.tableKey, first.fieldKey, first.values);
                    validationSheetName = uniqueSheetName(workbook, VALIDATION_SHEET_NAME);
                    Sheet validationSheet = workbook.createSheet(validationSheetName);
                    int col = 0;
                    for (EnumSlot slot : enumSlots) {
                        String key = slot.tableKey + "." + slot.fieldKey;
                        validationSlotMap.put(key, new int[]{col, slot.values.size()});
                        Row keyRow = validationSheet.getRow(0) != null ? validationSheet.getRow(0) : validationSheet.createRow(0);
                        keyRow.createCell(col).setCellValue(key);
                        for (int i = 0; i < slot.values.size(); i++) {
                            Row valueRow = validationSheet.getRow(i + 1) != null ? validationSheet.getRow(i + 1) : validationSheet.createRow(i + 1);
                            valueRow.createCell(col).setCellValue(slot.values.get(i));
                        }
                        col++;
                    }
                    workbook.setSheetVisibility(workbook.getSheetIndex(validationSheet), SheetVisibility.HIDDEN);
                }

                if (options.includeInstructionsSheet()) {
                    addInstructionsSheet(workbook, tables);
                }
                for (JsonNode table : tables) {
                    addDataSheet(workbook, table, options, validationSlotMap, validationSheetName);
                }
            }

            addMetadataSheet(workbook, templateId, versionId, versionNumber, schemaHash);
            workbook.write(outputStream);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to write workbook", e);
        } finally {
            workbook.dispose();
            try {
                workbook.close();
            } catch (IOException e) {
                // ignore on close
            }
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private void addInstructionsSheet(Workbook workbook, JsonNode tables) {
        Sheet sheet = workbook.createSheet(uniqueSheetName(workbook, INSTRUCTIONS_SHEET_NAME));
        int rowNum = 0;
        Row headerRow = sheet.createRow(rowNum++);
        String[] headers = {"Table (sheet)", "Field (headerName)", "fieldKey", "type", "required", "validations"};
        for (int i = 0; i < headers.length; i++) {
            Cell c = headerRow.createCell(i);
            c.setCellValue(headers[i]);
        }
        for (JsonNode table : tables) {
            String sheetName = getSheetName(table);
            JsonNode fields = table.get("fields");
            if (fields == null || !fields.isArray()) continue;
            for (JsonNode field : fields) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(sheetName);
                row.createCell(1).setCellValue(field.has("headerName") && field.get("headerName").isTextual() ? field.get("headerName").asText() : "");
                row.createCell(2).setCellValue(field.has("fieldKey") && field.get("fieldKey").isTextual() ? field.get("fieldKey").asText() : "");
                row.createCell(3).setCellValue(field.has("type") && field.get("type").isTextual() ? field.get("type").asText() : "");
                row.createCell(4).setCellValue(field.has("required") && field.get("required").asBoolean(false) ? "Yes" : "");
                row.createCell(5).setCellValue(validationsSummary(field));
            }
        }
    }

    private String validationsSummary(JsonNode field) {
        JsonNode v = field.get("validations");
        if (v == null || !v.isObject()) return "";
        List<String> parts = new ArrayList<>();
        List<String> enumVals = getEnumValues(field);
        if (!enumVals.isEmpty()) parts.add("enum(" + enumVals.size() + ")");
        if (v.has("min") && v.get("min").isNumber()) parts.add("min=" + v.get("min").asText());
        if (v.has("max") && v.get("max").isNumber()) parts.add("max=" + v.get("max").asText());
        return String.join(", ", parts);
    }

    private void addDataSheet(Workbook workbook, JsonNode table, ExportOptions options, Map<String, int[]> validationSlotMap, String validationSheetName) {
        String sheetName = getSheetName(table);
        Sheet sheet = workbook.createSheet(sanitizeSheetName(sheetName, workbook));
        String tableKey = getTableKey(table);

        JsonNode fields = table.get("fields");
        int numCols = (fields != null && fields.isArray()) ? fields.size() : 0;

        CellStyle headerStyle = createHeaderStyle(workbook);
        Row headerRow = sheet.createRow(0);
        int colIndex = 0;
        if (fields != null && fields.isArray()) {
            for (JsonNode field : fields) {
                String headerName = field.has("headerName") && field.get("headerName").isTextual()
                        ? field.get("headerName").asText()
                        : "";
                boolean required = field.has("required") && field.get("required").asBoolean(false);
                if (required) {
                    headerName = headerName + REQUIRED_HEADER_SUFFIX;
                }
                Cell cell = headerRow.createCell(colIndex++);
                cell.setCellValue(headerName);
                cell.setCellStyle(headerStyle);
            }
        }

        for (int i = 0; i < numCols; i++) {
            sheet.setColumnWidth(i, DATA_SHEET_COLUMN_WIDTH);
        }

        sheet.createFreezePane(0, 1);

        if (options.includeValidationRules() && fields != null && fields.isArray()) {
            applyValidations(sheet, tableKey, fields, validationSlotMap, validationSheetName);
        }

        // Sheet protection disabled for stability; export always uses current options without protection.
        applyCurrencyColumnFormats(workbook, sheet, fields, numCols, false);
    }

    /** Applies numeric/currency format (#,##0.00) to CURRENCY columns for data rows 1..VALIDATION_ROW_END. */
    private void applyCurrencyColumnFormats(Workbook workbook, Sheet sheet, JsonNode fields, int numCols, boolean sheetProtected) {
        if (fields == null || !fields.isArray()) return;
        short currencyFormat = workbook.createDataFormat().getFormat("#,##0.00");
        CellStyle currencyStyle = workbook.createCellStyle();
        currencyStyle.setDataFormat(currencyFormat);
        if (sheetProtected) currencyStyle.setLocked(false);
        int colIndex = 0;
        for (JsonNode field : fields) {
            String type = field.has("type") && field.get("type").isTextual() ? field.get("type").asText().trim().toUpperCase() : "";
            if ("CURRENCY".equals(type)) {
                for (int r = 1; r <= VALIDATION_ROW_END; r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) row = sheet.createRow(r);
                    Cell cell = row.getCell(colIndex);
                    if (cell == null) cell = row.createCell(colIndex);
                    cell.setCellStyle(currencyStyle);
                }
            }
            colIndex++;
            if (colIndex >= numCols) break;
        }
    }

    private void protectSheetWithUnlockedDataRange(Sheet sheet, int numCols) {
        CellStyle unlockedStyle = sheet.getWorkbook().createCellStyle();
        unlockedStyle.setLocked(false);
        for (int r = 1; r <= PROTECTION_DATA_ROW_END; r++) {
            Row row = sheet.createRow(r);
            for (int c = 0; c < numCols; c++) {
                Cell cell = row.createCell(c);
                cell.setCellStyle(unlockedStyle);
            }
        }
        sheet.protectSheet(null);
    }

    private static String getSheetName(JsonNode table) {
        if (table.has("sheetName") && table.get("sheetName").isTextual()) {
            return table.get("sheetName").asText().trim();
        }
        return "Sheet";
    }

    private String sanitizeSheetName(String name, Workbook workbook) {
        if (name == null || name.isBlank()) return "Sheet";
        String s = name.replaceAll("[\\\\/?*\\[\\]]", "_");
        if (s.length() > 31) s = s.substring(0, 31);
        return uniqueSheetName(workbook, s);
    }

    private String uniqueSheetName(Workbook workbook, String base) {
        String name = base;
        int i = 0;
        while (workbook.getSheet(name) != null) {
            String suffix = "_" + (++i);
            name = (base.length() + suffix.length() > 31) ? base.substring(0, 31 - suffix.length()) + suffix : base + suffix;
        }
        return name;
    }

    private void applyValidations(Sheet sheet, String tableKey, JsonNode fields, Map<String, int[]> validationSlotMap, String validationSheetName) {
        DataValidationHelper helper = sheet.getDataValidationHelper();
        String dataSheetName = sheet.getSheetName();
        int colIndex = 0;
        for (JsonNode field : fields) {
            String type = field.has("type") && field.get("type").isTextual() ? field.get("type").asText().trim().toUpperCase() : "";
            String fieldKey = getFieldKey(field);
            JsonNode validations = field.get("validations");

            if ("TEXT".equals(type)) {
                List<String> enumValues = getEnumValues(field);
                if (!enumValues.isEmpty()) {
                    String slotKey = tableKey + "." + fieldKey;
                    int[] slot = validationSlotMap != null ? validationSlotMap.get(slotKey) : null;
                    boolean applied = false;
                    if (validationSheetName != null && slot != null) {
                        String colLetter = columnIndexToLetter(slot[0]);
                        int valueCount = slot[1];
                        String formula = "'" + validationSheetName.replace("'", "''") + "'!$" + colLetter + "$2:$" + colLetter + "$" + (1 + valueCount);
                        try {
                            DataValidationConstraint constraint = helper.createFormulaListConstraint(formula);
                            CellRangeAddressList addressList = new CellRangeAddressList(1, VALIDATION_ROW_END, colIndex, colIndex);
                            DataValidation validation = helper.createValidation(constraint, addressList);

                            validation.setErrorStyle(DataValidation.ErrorStyle.STOP);
                            validation.setShowErrorBox(true);
                            validation.setEmptyCellAllowed(true);
                            if (validation instanceof XSSFDataValidation) {
                                validation.setSuppressDropDownArrow(true);
                            } else {
                                validation.setSuppressDropDownArrow(false);
                            }

                            sheet.addValidationData(validation);
                            applied = true;
                            log.info("Applying enum dropdown: sheet={} field={} column={} formula={}", dataSheetName, fieldKey, colIndex, formula);
                        } catch (Exception e) {
                            log.debug("Formula-list dropdown failed for {} column {}, falling back to explicit list: {}", slotKey, colIndex, e.getMessage());
                        }
                    }
                    if (!applied) {
                        try {
                            DataValidationConstraint constraint = helper.createExplicitListConstraint(enumValues.toArray(new String[0]));
                            CellRangeAddressList addressList = new CellRangeAddressList(1, VALIDATION_ROW_END, colIndex, colIndex);
                            DataValidation validation = helper.createValidation(constraint, addressList);

                            validation.setErrorStyle(DataValidation.ErrorStyle.STOP);
                            validation.setShowErrorBox(true);
                            validation.setEmptyCellAllowed(true);
                            if (validation instanceof XSSFDataValidation) {
                                validation.setSuppressDropDownArrow(true);
                            } else {
                                validation.setSuppressDropDownArrow(false);
                            }

                            sheet.addValidationData(validation);
                            log.info("Applying enum dropdown (explicit list fallback): sheet={} field={} column={} values={}", dataSheetName, fieldKey, colIndex, enumValues);
                        } catch (Exception ignored) {
                            // skip if unsupported
                        }
                    }
                }
            }

            if (validations != null && validations.isObject() && ("NUMBER".equals(type) || "CURRENCY".equals(type))) {
                JsonNode minNode = validations.get("min");
                JsonNode maxNode = validations.get("max");
                double minVal = minNode != null && minNode.isNumber() ? minNode.asDouble() : Double.NaN;
                double maxVal = maxNode != null && maxNode.isNumber() ? maxNode.asDouble() : Double.NaN;
                boolean hasMin = !Double.isNaN(minVal);
                boolean hasMax = !Double.isNaN(maxVal);
                if (hasMin || hasMax) {
                    try {
                        DataValidationConstraint constraint;
                        if (hasMin && hasMax && minVal <= maxVal) {
                            constraint = helper.createNumericConstraint(
                                    DataValidationConstraint.ValidationType.DECIMAL,
                                    DataValidationConstraint.OperatorType.BETWEEN,
                                    String.valueOf(minVal),
                                    String.valueOf(maxVal)
                            );
                        } else if (hasMin) {
                            constraint = helper.createNumericConstraint(
                                    DataValidationConstraint.ValidationType.DECIMAL,
                                    DataValidationConstraint.OperatorType.GREATER_OR_EQUAL,
                                    String.valueOf(minVal),
                                    null
                            );
                        } else {
                            constraint = helper.createNumericConstraint(
                                    DataValidationConstraint.ValidationType.DECIMAL,
                                    DataValidationConstraint.OperatorType.LESS_OR_EQUAL,
                                    String.valueOf(maxVal),
                                    null
                            );
                        }
                        CellRangeAddressList addressList = new CellRangeAddressList(1, VALIDATION_ROW_END, colIndex, colIndex);
                        DataValidation validation = helper.createValidation(constraint, addressList);
                        validation.setErrorStyle(DataValidation.ErrorStyle.STOP);
                        validation.setShowErrorBox(true);
                        validation.setEmptyCellAllowed(true);
                        validation.setSuppressDropDownArrow(false);
                        sheet.addValidationData(validation);
                    } catch (Exception ignored) {
                        // skip if unsupported
                    }
                }
            }

            if ("BOOLEAN".equals(type)) {
                try {
                    DataValidationConstraint constraint = helper.createExplicitListConstraint(new String[]{"Yes", "No"});
                    CellRangeAddressList addressList = new CellRangeAddressList(1, VALIDATION_ROW_END, colIndex, colIndex);
                    DataValidation validation = helper.createValidation(constraint, addressList);
                    validation.setErrorStyle(DataValidation.ErrorStyle.STOP);
                    validation.setShowErrorBox(true);
                    validation.setEmptyCellAllowed(true);
                    if (validation instanceof XSSFDataValidation) {
                        validation.setSuppressDropDownArrow(true);
                    } else {
                        validation.setSuppressDropDownArrow(false);
                    }
                    sheet.addValidationData(validation);
                } catch (Exception ignored) {
                    // skip if unsupported
                }
            }
            colIndex++;
        }
    }

    private void addMetadataSheet(Workbook workbook, UUID templateId, UUID versionId, int versionNumber, String schemaHash) {
        Sheet meta = workbook.createSheet(METADATA_SHEET_NAME);
        Instant now = Instant.now();
        String generatedAt = now.toString();
        setMetadataRow(meta, 0, "template_id", templateId.toString());
        setMetadataRow(meta, 1, "version_id", versionId.toString());
        setMetadataRow(meta, 2, "version_number", String.valueOf(versionNumber));
        setMetadataRow(meta, 3, "schema_hash", schemaHash);
        setMetadataRow(meta, 4, "generated_at", generatedAt);
        setMetadataRow(meta, 5, "generator_version", GENERATOR_VERSION);
        workbook.setSheetVisibility(workbook.getSheetIndex(meta), SheetVisibility.VERY_HIDDEN);
    }

    private void setMetadataRow(Sheet sheet, int rowIndex, String key, String value) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(key);
        row.createCell(1).setCellValue(value);
    }
}
