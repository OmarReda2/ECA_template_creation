/** Mirrors backend schema (UpdateSchemaRequest) structure. */

export interface FieldValidations {
  enum?: string[];
  min?: number;
  max?: number;
}

export interface FieldDefinition {
  fieldKey: string;
  headerName: string;
  type: string;
  required?: boolean;
  validations?: FieldValidations;
}

export interface TableDefinition {
  tableKey: string;
  sheetName: string;
  order?: number;
  fields: FieldDefinition[];
}

export interface ExportProfile {
  format?: string;
  includeInstructionsSheet?: boolean;
  protectSheets?: boolean;
}

export interface SchemaDefinition {
  templateName?: string;
  sectorCode: string;
  tables: TableDefinition[];
  exportProfile?: ExportProfile;
}

export interface UpdateSchemaResponse {
  versionId: string;
  schemaHash: string;
}
