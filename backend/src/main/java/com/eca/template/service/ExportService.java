package com.eca.template.service;

import com.eca.template.dto.ExportRequest;
import com.eca.template.exception.NotFoundException;
import com.eca.template.exception.SchemaExportException;
import com.eca.template.excel.ExportOptions;
import com.eca.template.entity.TemplateVersionEntity;
import com.eca.template.repository.TemplateVersionJpaRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.eca.template.excel.ExcelWorkbookBuilder;

import java.io.OutputStream;
import java.util.UUID;

@Service
public class ExportService {

    private final TemplateVersionJpaRepository versionRepository;
    private final ExcelWorkbookBuilder excelWorkbookBuilder;

    public ExportService(TemplateVersionJpaRepository versionRepository, ExcelWorkbookBuilder excelWorkbookBuilder) {
        this.versionRepository = versionRepository;
        this.excelWorkbookBuilder = excelWorkbookBuilder;
    }

    /**
     * Returns the attachment filename for exporting this version.
     * If requestFileName is non-null and non-blank, sanitize and use it (ensure .xlsx suffix); otherwise templateName_vN.xlsx.
     */
    @Transactional(readOnly = true)
    public String getExportFilename(UUID versionId, String requestFileName) {
        TemplateVersionEntity version = versionRepository.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Version not found: " + versionId));
        if (requestFileName != null && !requestFileName.isBlank()) {
            String base = sanitizeExportFilename(requestFileName.trim());
            return base.endsWith(".xlsx") ? base : (base + ".xlsx");
        }
        String templateName = version.getTemplate().getName();
        return sanitizeExportFilename(templateName) + "_v" + version.getVersionNumber() + ".xlsx";
    }
    public static String sanitizeExportFilename(String name) {
        if (name == null || name.isBlank()) return "template";
        return name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
    }

    /**
     * Writes the XLSX workbook for this version to the output stream (ExportExcel use case).
     * ExportRequest may be null (default options: no instructions, validation rules on, no protection).
     */
    @Transactional(readOnly = true)
    public void writeExportWorkbook(UUID versionId, OutputStream outputStream, ExportRequest request) {
        TemplateVersionEntity version = versionRepository.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Version not found: " + versionId));
        JsonNode schemaJson = version.getSchemaJson();
        if (schemaJson == null || !schemaJson.has("tables") || !schemaJson.get("tables").isArray()) {
            throw new SchemaExportException("Schema is missing tables array required for export");
        }
        ExportOptions options = request == null
                ? ExportOptions.defaults()
                : new ExportOptions(
                Boolean.TRUE.equals(request.includeInstructionsSheet()),
                Boolean.TRUE.equals(request.includeValidationRules()),
                Boolean.TRUE.equals(request.protectSheets())
        );
        String templateName = version.getTemplate().getName();
        excelWorkbookBuilder.writeWorkbook(
                schemaJson,
                templateName,
                version.getTemplate().getId(),
                version.getId(),
                version.getVersionNumber(),
                version.getSchemaHash(),
                options,
                outputStream
        );
    }
}
