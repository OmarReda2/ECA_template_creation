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
 * POI SXSSF implementation of ExcelWorkbookBuilder. Streaming workbook, metadata sheet, validations.
 */
@Component
public class SXSSFExcelWorkbookBuilder implements ExcelWorkbookBuilder {

    private static final String METADATA_SHEET_NAME = "__metadata__";
    private static final int VALIDATION_ROW_END = 1000;
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
            OutputStream outputStream) {
        SXSSFWorkbook workbook = new SXSSFWorkbook(SXSSFWorkbook.DEFAULT_WINDOW_SIZE);
        try {
            JsonNode tables = schemaJson != null ? schemaJson.get("tables") : null;
            if (tables != null && tables.isArray()) {
                for (JsonNode table : tables) {
                    addDataSheet(workbook, table);
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

    private void addDataSheet(Workbook workbook, JsonNode table) {
        String sheetName = getSheetName(table);
        Sheet sheet = workbook.createSheet(sanitizeSheetName(sheetName, workbook));

        JsonNode fields = table.get("fields");
        if (fields == null || !fields.isArray()) return;

        Row headerRow = sheet.createRow(0);
        int colIndex = 0;
        for (JsonNode field : fields) {
            String headerName = field.has("headerName") && field.get("headerName").isTextual()
                    ? field.get("headerName").asText()
                    : "";
            boolean required = field.has("required") && field.get("required").asBoolean(false);
            if (required) {
                headerName = headerName + REQUIRED_HEADER_SUFFIX;
            }
            Cell cell = headerRow.createCell(colIndex);
            cell.setCellValue(headerName);
            colIndex++;
        }

        applyValidations(sheet, fields);
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
