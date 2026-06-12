import type { SchemaDefinition } from '../types';

/**
 * Builds the schema payload for PUT /api/versions/{versionId}/schema.
 * Use in both Step 2 (SchemaEditorView) and Step 3 (CreateTemplateExportPage) so
 * validations.enum is sent as enumValues and the backend receives a consistent shape.
 */
export function buildSchemaPayloadForUpdate(schema: SchemaDefinition): unknown {
  return {
    ...(schema.templateName != null && { templateName: schema.templateName }),
    sectorCode: schema.sectorCode ?? '',
    tables: schema.tables.map((t) => ({
      tableKey: t.tableKey,
      sheetName: t.sheetName,
      ...(t.order != null && { order: t.order }),
      fields: (t.fields ?? []).map((f) => ({
        fieldKey: f.fieldKey,
        headerName: f.headerName,
        type: f.type,
        ...(f.required != null && { required: f.required }),
        ...(f.validations &&
          (f.validations.enum?.length || f.validations.min != null || f.validations.max != null) && {
            validations: {
              ...(f.validations.enum?.length && { enumValues: f.validations.enum }),
              ...(f.validations.min != null && { min: f.validations.min }),
              ...(f.validations.max != null && { max: f.validations.max }),
            },
          }),
      })),
    })),
    ...(schema.exportProfile != null && { exportProfile: schema.exportProfile }),
  };
}
