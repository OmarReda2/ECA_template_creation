package com.eca.template.infrastructure.excel;

import com.fasterxml.jackson.databind.JsonNode;

import java.io.OutputStream;
import java.util.UUID;

/**
 * Builds Excel workbooks using Apache POI (SXSSF). All POI code lives here only.
 * Called by application layer for ExportExcel use case.
 */
public interface ExcelWorkbookBuilder {

    /**
     * Write workbook from schema and metadata to the given output stream.
     * Caller is responsible for closing the stream; this method closes the workbook after write.
     *
     * @param schemaJson     schema (tables with sheetName, fields with headerName, required, validations)
     * @param templateName   for filename and metadata
     * @param templateId     for metadata sheet
     * @param versionId      for metadata sheet
     * @param versionNumber  for metadata sheet and filename
     * @param schemaHash     for metadata sheet
     * @param options        include instructions sheet, validation rules, protect sheets
     * @param outputStream   stream to write workbook to (not closed by this method)
     */
    void writeWorkbook(
            JsonNode schemaJson,
            String templateName,
            UUID templateId,
            UUID versionId,
            int versionNumber,
            String schemaHash,
            ExportOptions options,
            OutputStream outputStream
    );
}
