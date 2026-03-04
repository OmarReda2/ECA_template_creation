import type { FieldValidations, TableDefinition } from '../types';

export interface ValidationError {
  path: string;
  message: string;
}

export const ALLOWED_FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'CURRENCY'] as const;
export type AllowedFieldType = (typeof ALLOWED_FIELD_TYPES)[number];

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

/**
 * Returns validations cleaned for the given type: removes enum for non-TEXT,
 * removes min/max for non-NUMBER/CURRENCY.
 */
export function sanitizeValidationsByType(
  type: string,
  validations: FieldValidations | undefined
): FieldValidations | undefined {
  if (!validations) return undefined;
  const normalizedType = (type ?? '').trim().toUpperCase();
  const out: FieldValidations = {};

  if (normalizedType === 'TEXT') {
    if (validations.enum?.length) out.enum = validations.enum;
    // min/max not allowed for TEXT — omit
  } else if (normalizedType === 'NUMBER' || normalizedType === 'CURRENCY') {
    if (validations.min != null && typeof validations.min === 'number') out.min = validations.min;
    if (validations.max != null && typeof validations.max === 'number') out.max = validations.max;
    // enum not allowed — omit
  }
  // DATE, BOOLEAN: no validations allowed

  if (Object.keys(out).length === 0) return undefined;
  return out;
}

function validateFieldValidations(
  validations: FieldValidations | undefined,
  type: string,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!validations) return errors;
  const normalizedType = (type ?? '').trim().toUpperCase();

  if (validations.enum != null && validations.enum.length > 0) {
    if (normalizedType !== 'TEXT') {
      errors.push({
        path: `${path}.validations.enum`,
        message: 'Enum is only allowed for type TEXT.',
      });
    }
  }

  const hasMin = validations.min != null && typeof validations.min === 'number';
  const hasMax = validations.max != null && typeof validations.max === 'number';
  if (hasMin || hasMax) {
    if (normalizedType !== 'NUMBER' && normalizedType !== 'CURRENCY') {
      errors.push({
        path: `${path}.validations`,
        message: 'Min/max are only allowed for NUMBER or CURRENCY.',
      });
    } else {
      if (hasMin && hasMax && validations.min! > validations.max!) {
        errors.push({ path: `${path}.validations`, message: 'Min must be less than or equal to max.' });
      }
    }
  }
  return errors;
}

/**
 * Client-side validation before save.
 * - Unique tableKey across schema (case-insensitive)
 * - Unique sheetName across schema after trim
 * - Unique fieldKey per table (case-insensitive)
 * - Excel sheetName: <=31 chars, no \\ / ? * [ ]
 * - type in allowed list; enum only for TEXT; min/max only for NUMBER/CURRENCY; min <= max
 */
export function validateSchema(tables: TableDefinition[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const tableKeys = new Set<string>();
  const sheetNamesTrimmed = new Set<string>();

  tables.forEach((table, ti) => {
    const tablePrefix = `tables[${ti + 1}]`;

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
    if (sheetErr) {
      errors.push({ path: `${tablePrefix}.sheetName`, message: sheetErr });
    } else {
      const sheetTrimmed = String(table.sheetName).trim().toLowerCase();
      if (sheetNamesTrimmed.has(sheetTrimmed)) {
        errors.push({ path: `${tablePrefix}.sheetName`, message: 'Sheet name must be unique (after trimming).' });
      }
      sheetNamesTrimmed.add(sheetTrimmed);
    }

    const fieldKeys = new Set<string>();
    (table.fields ?? []).forEach((field, fi) => {
      const fieldPrefix = `${tablePrefix}.fields[${fi + 1}]`;

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

      const fieldType = (field.type ?? '').trim();
      if (!fieldType) {
        errors.push({ path: `${fieldPrefix}.type`, message: 'Type is required.' });
      } else if (!ALLOWED_FIELD_TYPES.includes(fieldType as AllowedFieldType)) {
        errors.push({
          path: `${fieldPrefix}.type`,
          message: `Type must be one of: ${ALLOWED_FIELD_TYPES.join(', ')}.`,
        });
      }

      errors.push(...validateFieldValidations(field.validations, field.type ?? '', fieldPrefix));
    });
  });

  return errors;
}
