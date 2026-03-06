package com.eca.template.infrastructure.excel;

import com.fasterxml.jackson.databind.JsonNode;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.OutputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * POI SXSSF implementation of ExcelWorkbookBuilder.
 * Always applies light blue header style and freeze first row.
 * Optional: instructions sheet, validation rules, sheet protection.
 */
@Component
public class SXSSFExcelWorkbookBuilder implements ExcelWorkbookBuilder {

    private static final String METADATA_SHEET_NAME = "__metadata__";
    private static final String INSTRUCTIONS_SHEET_NAME = "Instructions";
    private static final int VALIDATION_ROW_END = 1000;
    private static final int PROTECTION_DATA_ROW_END = 1000;
    /** Excel width units for data-sheet columns (~30 character units; POI uses 1/256th). */
    private static final int DATA_SHEET_COLUMN_WIDTH = 30 * 256;
    private static final String GENERATOR_VERSION = "template-service/0.1";
    private static final String REQUIRED_HEADER_SUFFIX = " *";

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

            if (options.includeInstructionsSheet() && tables != null && tables.isArray()) {
                addInstructionsSheet(workbook, tables);
            }

            if (tables != null && tables.isArray()) {
                for (JsonNode table : tables) {
                    addDataSheet(workbook, table, options);
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
        if (v.has("enum") && v.get("enum").isArray()) {
            int n = v.get("enum").size();
            parts.add("enum(" + n + ")");
        }
        if (v.has("min") && v.get("min").isNumber()) parts.add("min=" + v.get("min").asText());
        if (v.has("max") && v.get("max").isNumber()) parts.add("max=" + v.get("max").asText());
        return String.join(", ", parts);
    }

    private void addDataSheet(Workbook workbook, JsonNode table, ExportOptions options) {
        String sheetName = getSheetName(table);
        Sheet sheet = workbook.createSheet(sanitizeSheetName(sheetName, workbook));

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
            applyValidations(sheet, fields);
        }

        if (options.protectSheets()) {
            protectSheetWithUnlockedDataRange(sheet, numCols);
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

    private String getSheetName(JsonNode table) {
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

    private void applyValidations(Sheet sheet, JsonNode fields) {
        DataValidationHelper helper = sheet.getDataValidationHelper();
        int colIndex = 0;
        for (JsonNode field : fields) {
            String type = field.has("type") && field.get("type").isTextual() ? field.get("type").asText().toUpperCase() : "";
            JsonNode validations = field.get("validations");
            if (validations != null && validations.isObject()) {
                JsonNode enumNode = validations.get("enum");
                if (enumNode != null && enumNode.isArray() && enumNode.size() > 0) {
                    if ("TEXT".equals(type)) {
                        List<String> values = new ArrayList<>();
                        for (JsonNode v : enumNode) {
                            if (v.isTextual()) values.add(v.asText());
                        }
                        if (!values.isEmpty()) {
                            try {
                                DataValidationConstraint constraint = helper.createExplicitListConstraint(values.toArray(new String[0]));
                                CellRangeAddressList addressList = new CellRangeAddressList(1, VALIDATION_ROW_END, colIndex, colIndex);
                                DataValidation validation = helper.createValidation(constraint, addressList);
                                validation.setSuppressDropDownArrow(false);
                                sheet.addValidationData(validation);
                            } catch (Exception ignored) {
                                // unsupported or too many values; skip
                            }
                        }
                    }
                }
                if ("NUMBER".equals(type) || "CURRENCY".equals(type)) {
                    JsonNode minNode = validations.get("min");
                    JsonNode maxNode = validations.get("max");
                    if (minNode != null && minNode.isNumber() && maxNode != null && maxNode.isNumber()) {
                        try {
                            double min = minNode.asDouble();
                            double max = maxNode.asDouble();
                            DataValidationConstraint constraint = helper.createNumericConstraint(
                                    DataValidationConstraint.ValidationType.DECIMAL,
                                    DataValidationConstraint.OperatorType.BETWEEN,
                                    String.valueOf(min),
                                    String.valueOf(max)
                            );
                            CellRangeAddressList addressList = new CellRangeAddressList(1, VALIDATION_ROW_END, colIndex, colIndex);
                            DataValidation validation = helper.createValidation(constraint, addressList);
                            sheet.addValidationData(validation);
                        } catch (Exception ignored) {
                            // skip if unsupported
                        }
                    }
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
