package com.eca.template.excel;

/**
 * Options for workbook generation. Passed from application layer; only infrastructure uses it.
 */
public record ExportOptions(
        boolean includeInstructionsSheet,
        boolean includeValidationRules,
        boolean protectSheets
) {
    public static ExportOptions defaults() {
        return new ExportOptions(false, true, false);
    }
}
