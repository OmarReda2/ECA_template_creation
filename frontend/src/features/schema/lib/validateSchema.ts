import type { FieldValidations, TableDefinition } from '../types';

export interface ValidationError {
  path: string;
  message: string;
}

const SHEET_NAME_MAX_LENGTH = 31;
const SHEET_NAME_FORBIDDEN = /[\\/?*[\]]/;

function validateSheetName(sheetName: string): string | null {
  if (!sheetName || typeof sheetName !== 'string') return 'Sheet name is required.';
  const trimmed = sheetName.trim();
  if (trimmed.length === 0) return 'Sheet name cannot be empty.';
  if (trimmed.length > SHEET_NAME_MAX_LENGTH) return `Sheet name must be ${SHEET_NAME_MAX_LENGTH} characters or fewer.`;
  if (SHEET_NAME_FORBIDDEN.test(trimmed)) return 'Sheet name cannot contain \\ / ? * [ or ].';
  return null;
}

function validateFieldValidations(validations: FieldValidations | undefined, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!validations) return errors;
  const { min, max } = validations;
  if (min != null && max != null && typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push({ path: `${path}.validations`, message: 'min must be less than or equal to max.' });
  }
  return errors;
}

/**
 * Client-side validation before save.
 * - Unique tableKey across schema
 * - Unique fieldKey per table
 * - Excel sheetName: <=31 chars, no \\ / ? * [ ]
 * - If min/max exist, min <= max
 */
export function validateSchema(tables: TableDefinition[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const tableKeys = new Set<string>();

  tables.forEach((table, ti) => {
    const tablePrefix = `tables[${ti}]`;

    if (!table.tableKey || !String(table.tableKey).trim()) {
      errors.push({ path: `${tablePrefix}.tableKey`, message: 'Table key is required.' });
    } else {
      const key = String(table.tableKey).trim().toLowerCase();
      if (tableKeys.has(key)) {
        errors.push({ path: `${tablePrefix}.tableKey`, message: 'Table key must be unique across the schema.' });
      }
      tableKeys.add(key);
    }

    const sheetErr = validateSheetName(table.sheetName ?? '');
    if (sheetErr) errors.push({ path: `${tablePrefix}.sheetName`, message: sheetErr });

    const fieldKeys = new Set<string>();
    (table.fields ?? []).forEach((field, fi) => {
      const fieldPrefix = `${tablePrefix}.fields[${fi}]`;

      if (!field.fieldKey || !String(field.fieldKey).trim()) {
        errors.push({ path: `${fieldPrefix}.fieldKey`, message: 'Field key is required.' });
      } else {
        const fk = String(field.fieldKey).trim().toLowerCase();
        if (fieldKeys.has(fk)) {
          errors.push({ path: `${fieldPrefix}.fieldKey`, message: 'Field key must be unique within this table.' });
        }
        fieldKeys.add(fk);
      }

      if (!field.headerName || !String(field.headerName).trim()) {
        errors.push({ path: `${fieldPrefix}.headerName`, message: 'Header name is required.' });
      }
      if (!field.type || !String(field.type).trim()) {
        errors.push({ path: `${fieldPrefix}.type`, message: 'Type is required.' });
      }

      errors.push(...validateFieldValidations(field.validations, fieldPrefix));
    });
  });

  return errors;
}
