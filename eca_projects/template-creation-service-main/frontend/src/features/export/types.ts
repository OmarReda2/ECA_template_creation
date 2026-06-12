/** Payload sent to POST /api/versions/{versionId}/export. Only XLSX is supported. */
export interface ExportRequest {
  format?: string;
  fileName?: string | null;
  includeInstructionsSheet?: boolean;
  includeValidationRules?: boolean;
  protectSheets?: boolean;
}
