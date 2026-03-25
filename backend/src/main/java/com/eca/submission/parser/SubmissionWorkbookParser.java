package com.eca.submission.parser;

import com.eca.submission.exception.SubmissionWorkbookException;
import com.eca.submission.model.ParsedSubmissionMetadata;
import com.eca.submission.model.SubmissionIdentifyStatus;
import org.apache.poi.openxml4j.exceptions.OLE2NotOfficeXmlFileException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Component
public class SubmissionWorkbookParser {

    private static final String METADATA_SHEET_NAME = "__metadata__";
    private final DataFormatter dataFormatter = new DataFormatter(Locale.ROOT);

    public ParsedSubmissionMetadata parse(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new SubmissionWorkbookException(SubmissionIdentifyStatus.UNSUPPORTED_FILE, "Please upload an Excel workbook.");
        }

        if (!hasSupportedFilename(file.getOriginalFilename())) {
            throw new SubmissionWorkbookException(SubmissionIdentifyStatus.UNSUPPORTED_FILE, "Only .xlsx workbooks are supported.");
        }

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet metadataSheet = workbook.getSheet(METADATA_SHEET_NAME);
            if (metadataSheet == null) {
                return new ParsedSubmissionMetadata(null, null, null, null, null, null);
            }

            Map<String, String> metadataMap = new HashMap<>();
            for (Row row : metadataSheet) {
                String key = readCell(row.getCell(0));
                if (key.isBlank()) {
                    continue;
                }
                metadataMap.put(key.trim(), readCell(row.getCell(1)).trim());
            }

            return new ParsedSubmissionMetadata(
                    emptyToNull(metadataMap.get("template_id")),
                    emptyToNull(metadataMap.get("version_id")),
                    emptyToNull(metadataMap.get("version_number")),
                    emptyToNull(metadataMap.get("schema_hash")),
                    emptyToNull(metadataMap.get("generated_at")),
                    emptyToNull(metadataMap.get("generator_version"))
            );
        } catch (OLE2NotOfficeXmlFileException e) {
            throw new SubmissionWorkbookException(SubmissionIdentifyStatus.UNSUPPORTED_FILE, "Only .xlsx workbooks are supported.");
        } catch (IOException e) {
            throw new SubmissionWorkbookException(SubmissionIdentifyStatus.UNSUPPORTED_FILE, "The uploaded workbook could not be read.");
        } catch (RuntimeException e) {
            throw new SubmissionWorkbookException(SubmissionIdentifyStatus.UNSUPPORTED_FILE, "The uploaded workbook is corrupt or unsupported.");
        }
    }

    private boolean hasSupportedFilename(String originalFilename) {
        return originalFilename != null && originalFilename.toLowerCase(Locale.ROOT).endsWith(".xlsx");
    }

    private String readCell(Cell cell) {
        return cell == null ? "" : dataFormatter.formatCellValue(cell);
    }

    private String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }
}
