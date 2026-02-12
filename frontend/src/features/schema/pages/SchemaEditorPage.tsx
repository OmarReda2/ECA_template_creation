import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templatesApi } from '@/features/templates/api';
import { versionsApi } from '@/features/versions/api';
import type { VersionDetail } from '@/features/versions/types';
import type {
  TableDefinition,
  FieldDefinition,
  FieldValidations,
  SchemaDefinition,
} from '../types';
import { validateSchema } from '../lib/validateSchema';
import {
  ActionButton,
  ActionLink,
  DangerActionButton,
  IconArrowLeft,
  IconDelete,
  IconEdit,
} from '@/shared/ui/ActionButtons';
import { Button } from '@/shared/ui/Button';
import { ErrorPanel } from '@/shared/errors/ErrorPanel';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { useToast } from '@/shared/ui/Toast';
import {
  normalizeHttpError,
  getErrorMessage,
  type FrontendError,
} from '@/shared/errors/errorTypes';
const SHEET_NAME_FORBIDDEN = /[\\/?*[\]]/;
const SHEET_NAME_MAX = 31;

function parseSchemaJson(raw: unknown): SchemaDefinition {
  if (raw == null || typeof raw !== 'object') return { sectorCode: '', tables: [] };
  const o = raw as Record<string, unknown>;
  const tables = Array.isArray(o.tables)
    ? (o.tables as unknown[]).map((t) => normalizeTable(t as Record<string, unknown>))
    : [];
  return {
    templateName: typeof o.templateName === 'string' ? o.templateName : undefined,
    sectorCode: typeof o.sectorCode === 'string' ? o.sectorCode : '',
    tables,
    exportProfile: o.exportProfile as SchemaDefinition['exportProfile'],
  };
}

function normalizeTable(t: Record<string, unknown>): TableDefinition {
  const fields = Array.isArray(t.fields)
    ? (t.fields as unknown[]).map((f) => normalizeField(f as Record<string, unknown>))
    : [];
  return {
    tableKey: String(t.tableKey ?? '').trim() || 'table',
    sheetName: String(t.sheetName ?? '').trim() || 'Sheet1',
    order: typeof t.order === 'number' ? t.order : undefined,
    fields,
  };
}

function normalizeField(f: Record<string, unknown>): FieldDefinition {
  const validations = f.validations as Record<string, unknown> | undefined;
  let validationsOut: FieldValidations | undefined;
  if (validations && typeof validations === 'object') {
    validationsOut = {};
    if (Array.isArray(validations.enum)) validationsOut.enum = validations.enum.map(String);
    else if (Array.isArray(validations.enumValues)) validationsOut.enum = validations.enumValues.map(String);
    if (typeof validations.min === 'number') validationsOut.min = validations.min;
    if (typeof validations.max === 'number') validationsOut.max = validations.max;
  }
  return {
    fieldKey: String(f.fieldKey ?? '').trim() || 'field',
    headerName: String(f.headerName ?? '').trim() || 'Header',
    type: String(f.type ?? 'TEXT').trim(),
    required: Boolean(f.required),
    validations: validationsOut,
  };
}

/** Build payload for PUT: backend expects validations.enumValues */
function buildPutPayload(schema: SchemaDefinition): unknown {
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

export default function SchemaEditorPage() {
  const { templateId, versionId } = useParams<{ templateId: string; versionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [templateInfo, setTemplateInfo] = useState<{ name: string; sectorCode: string } | null>(null);
  const [version, setVersion] = useState<VersionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<FrontendError | null>(null);
  const [schema, setSchema] = useState<SchemaDefinition>({ sectorCode: '', tables: [] });
  const initialSchemaRef = useRef<SchemaDefinition>({ sectorCode: '', tables: [] });
  const [saveError, setSaveError] = useState<FrontendError | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedTableIndex, setSelectedTableIndex] = useState<number | null>(null);
  const [tableModal, setTableModal] = useState<'add' | { edit: number } | null>(null);
  const [fieldModal, setFieldModal] = useState<'add' | { edit: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<'table' | 'field' | null>(null);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);

  const templateDetailsPath = templateId ? `/templates/${templateId}` : '/templates';
  const dirty = useMemo(
    () => JSON.stringify(schema.tables) !== JSON.stringify(initialSchemaRef.current.tables),
    [schema.tables]
  );

  const loadVersion = useCallback(async () => {
    if (!versionId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await versionsApi.getById(versionId);
      setVersion(data);
      const parsed = parseSchemaJson(data.schemaJson);
      setSchema(parsed);
      initialSchemaRef.current = JSON.parse(JSON.stringify(parsed));
      setSelectedTableIndex(parsed.tables.length > 0 ? 0 : null);
    } catch (e) {
      setLoadError(normalizeHttpError(e));
      setVersion(null);
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    loadVersion();
  }, [loadVersion]);

  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    templatesApi.getById(templateId).then(
      (t) => {
        if (!cancelled) setTemplateInfo({ name: t.name, sectorCode: t.sectorCode });
      },
      () => {
        if (!cancelled) setTemplateInfo(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const goBack = useCallback(() => {
    if (dirty && !window.confirm('You have unsaved changes. Leave?')) return;
    navigate(templateDetailsPath);
  }, [dirty, navigate, templateDetailsPath]);

  const validationErrors = useMemo(() => validateSchema(schema.tables), [schema.tables]);
  const canSave = validationErrors.length === 0;

  const handleSave = async () => {
    if (!versionId || !canSave) return;
    setSaveError(null);
    setSaving(true);
    try {
      const sectorCode = (schema.sectorCode?.trim() || templateInfo?.sectorCode) ?? '';
      const templateNameResolved = (schema.templateName?.trim() || templateInfo?.name) ?? schema.templateName;
      const mergedSchema: SchemaDefinition = {
        ...schema,
        sectorCode,
        ...(templateNameResolved != null && templateNameResolved !== '' && { templateName: templateNameResolved }),
      };
      const payload = buildPutPayload(mergedSchema);
      await versionsApi.updateSchema(versionId, payload);
      showToast('Schema saved.', 'success');
      initialSchemaRef.current = JSON.parse(JSON.stringify(schema));
      navigate(templateDetailsPath);
    } catch (e) {
      const err = normalizeHttpError(e);
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave?')) return;
    navigate(templateDetailsPath);
  };

  const updateTables = useCallback((updater: (prev: TableDefinition[]) => TableDefinition[]) => {
    setSchema((prev) => ({ ...prev, tables: updater(prev.tables) }));
  }, []);

  const selectedTable = selectedTableIndex != null ? schema.tables[selectedTableIndex] ?? null : null;

  const addTable = (tableKey: string, sheetName: string, order: number) => {
    updateTables((prev) => [...prev, { tableKey: tableKey.trim(), sheetName: sheetName.trim(), order, fields: [] }]);
    setSelectedTableIndex(schema.tables.length);
    setTableModal(null);
  };

  const editTable = (index: number, tableKey: string, sheetName: string, order: number) => {
    updateTables((prev) => {
      const next = [...prev];
      const t = next[index];
      if (t) next[index] = { ...t, tableKey: tableKey.trim(), sheetName: sheetName.trim(), order };
      return next;
    });
    setTableModal(null);
  };

  const deleteTable = (index: number) => {
    updateTables((prev) => prev.filter((_, i) => i !== index));
    setSelectedTableIndex(index >= schema.tables.length - 1 ? Math.max(0, index - 1) : index);
    setConfirmDelete(null);
    setDeleteTargetIndex(null);
  };

  const addField = (field: FieldDefinition) => {
    if (selectedTableIndex == null) return;
    updateTables((prev) => {
      const next = [...prev];
      const t = next[selectedTableIndex];
      if (t) next[selectedTableIndex] = { ...t, fields: [...(t.fields ?? []), field] };
      return next;
    });
    setFieldModal(null);
  };

  const editField = (fieldIndex: number, field: FieldDefinition) => {
    if (selectedTableIndex == null) return;
    updateTables((prev) => {
      const next = [...prev];
      const t = next[selectedTableIndex];
      if (!t) return prev;
      const fields = [...(t.fields ?? [])];
      fields[fieldIndex] = field;
      next[selectedTableIndex] = { ...t, fields };
      return next;
    });
    setFieldModal(null);
  };

  const deleteField = (fieldIndex: number) => {
    if (selectedTableIndex == null) return;
    updateTables((prev) => {
      const next = [...prev];
      const t = next[selectedTableIndex];
      if (!t) return prev;
      next[selectedTableIndex] = { ...t, fields: (t.fields ?? []).filter((_, i) => i !== fieldIndex) };
      return next;
    });
    setConfirmDelete(null);
    setDeleteTargetIndex(null);
  };

  if (!versionId || !templateId) {
    return <div className="text-sm text-red-600">Missing template or version ID.</div>;
  }
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="space-y-4">
        <ErrorPanel error={getErrorMessage(loadError, true)} onDismiss={() => setLoadError(null)} />
        <Button variant="secondary" onClick={goBack}>Back to template</Button>
      </div>
    );
  }
  if (!version) {
    return <div className="text-sm text-neutral-600">Version not found.</div>;
  }

  const is409 = saveError?.status === 409;
  const readOnly = is409;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={goBack} className="text-sm text-neutral-600 underline hover:text-neutral-900">
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-neutral-900">Schema builder · Version {version.versionNumber}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleCancel} disabled={readOnly}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || readOnly || !canSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {saveError && !is409 && (
        <ErrorPanel error={getErrorMessage(saveError, true)} onDismiss={() => setSaveError(null)} />
      )}

      {is409 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
          <p className="font-medium">Only the latest version is editable. This version is read-only.</p>
          <p className="mt-1 text-amber-700">
            <ActionLink to={templateDetailsPath}>
              <IconArrowLeft />
              Back to template details
            </ActionLink>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Tables */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-700">Tables</h2>
            {!readOnly && (
              <Button type="button" variant="secondary" onClick={() => setTableModal('add')}>
                Add table
              </Button>
            )}
          </div>
          <ul className="space-y-1">
            {schema.tables.length === 0 && (
              <li className="text-sm text-neutral-500">No tables. Add one to get started.</li>
            )}
            {schema.tables.map((t, i) => (
              <li key={i}>
                <div
                  className={`flex items-center justify-between rounded px-2 py-1.5 text-sm ${
                    selectedTableIndex === i ? 'bg-neutral-100 font-medium' : 'hover:bg-neutral-50'
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => setSelectedTableIndex(i)}
                  >
                    {t.tableKey} <span className="text-neutral-500">({t.sheetName})</span>
                  </button>
                  {!readOnly && (
                    <span className="flex items-center gap-1">
                      <ActionButton
                        as="button"
                        aria-label="Edit table"
                        onClick={() => setTableModal({ edit: i })}
                      >
                        <IconEdit />
                      </ActionButton>
                      <DangerActionButton
                        aria-label="Delete table"
                        onClick={() => { setConfirmDelete('table'); setDeleteTargetIndex(i); }}
                      >
                        <IconDelete />
                      </DangerActionButton>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Fields */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium text-neutral-700">
            Fields {selectedTable ? `· ${selectedTable.tableKey}` : ''}
          </h2>
          {selectedTable ? (
            <>
              {!readOnly && (
                <Button type="button" variant="secondary" className="mb-3" onClick={() => setFieldModal('add')}>
                  Add field
                </Button>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-neutral-500">
                      <th className="pb-2 pr-4">Field key</th>
                      <th className="pb-2 pr-4">Header</th>
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Required</th>
                      <th className="pb-2">Validations</th>
                      {!readOnly && <th className="w-0" />}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTable.fields ?? []).length === 0 && (
                      <tr><td colSpan={6} className="py-4 text-neutral-500">No fields.</td></tr>
                    )}
                    {(selectedTable.fields ?? []).map((f, fi) => (
                      <tr key={fi} className="border-b border-neutral-100">
                        <td className="py-2 pr-4 font-mono">{f.fieldKey}</td>
                        <td className="py-2 pr-4">{f.headerName}</td>
                        <td className="py-2 pr-4">{f.type}</td>
                        <td className="py-2 pr-4">{f.required ? 'Yes' : '—'}</td>
                        <td className="py-2">
                          {f.validations?.enum?.length ? `enum(${f.validations.enum.length})` : ''}
                          {f.validations?.min != null && ` min=${f.validations.min}`}
                          {f.validations?.max != null && ` max=${f.validations.max}`}
                          {!f.validations?.enum?.length && f.validations?.min == null && f.validations?.max == null && '—'}
                        </td>
                        {!readOnly && (
                          <td className="py-2">
                            <span className="flex items-center gap-1">
                              <ActionButton
                                as="button"
                                aria-label="Edit field"
                                onClick={() => setFieldModal({ edit: fi })}
                              >
                                <IconEdit />
                              </ActionButton>
                              <DangerActionButton
                                aria-label="Delete field"
                                onClick={() => { setConfirmDelete('field'); setDeleteTargetIndex(fi); }}
                              >
                                <IconDelete />
                              </DangerActionButton>
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500">Select a table to edit its fields.</p>
          )}
        </div>
      </div>

      {/* Validation results */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-medium text-amber-800">Validation errors (fix before save)</h3>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-amber-700">
            {validationErrors.map((e, i) => (
              <li key={i}><span className="font-mono text-amber-800">{e.path}</span>: {e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {dirty && validationErrors.length === 0 && (
        <p className="text-xs text-amber-700">You have unsaved changes.</p>
      )}

      {/* Advanced JSON (read-only) */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2">
        <button
          type="button"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
          onClick={() => setAdvancedJsonOpen((o) => !o)}
        >
          {advancedJsonOpen ? '▼' : '▶'} Advanced: view JSON
        </button>
        {advancedJsonOpen && (
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-2 font-mono text-xs text-neutral-700">
            {JSON.stringify(buildPutPayload(schema), null, 2)}
          </pre>
        )}
      </div>

      {/* Table modal */}
      {tableModal && (
        <TableModal
          schema={schema}
          mode={tableModal}
          onClose={() => setTableModal(null)}
          onAdd={addTable}
          onEdit={editTable}
        />
      )}

      {/* Field modal */}
      {fieldModal && selectedTable != null && (
        <FieldModal
          table={selectedTable}
          mode={fieldModal}
          onClose={() => setFieldModal(null)}
          onAdd={addField}
          onEdit={editField}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete === 'table' && deleteTargetIndex != null && (
        <Modal open={true} title="Delete table?" onClose={() => { setConfirmDelete(null); setDeleteTargetIndex(null); }}>
          <p className="text-sm text-neutral-700">
            Delete table &quot;{schema.tables[deleteTargetIndex]?.tableKey}&quot; and all its fields? This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setConfirmDelete(null); setDeleteTargetIndex(null); }}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteTable(deleteTargetIndex)}>Delete</Button>
          </div>
        </Modal>
      )}
      {confirmDelete === 'field' && deleteTargetIndex != null && selectedTable && (
        <Modal open={true} title="Delete field?" onClose={() => { setConfirmDelete(null); setDeleteTargetIndex(null); }}>
          <p className="text-sm text-neutral-700">
            Delete field &quot;{(selectedTable.fields ?? [])[deleteTargetIndex]?.fieldKey}&quot;?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setConfirmDelete(null); setDeleteTargetIndex(null); }}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteField(deleteTargetIndex)}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TableModal({
  schema,
  mode,
  onClose,
  onAdd,
  onEdit,
}: {
  schema: SchemaDefinition;
  mode: 'add' | { edit: number };
  onClose: () => void;
  onAdd: (tableKey: string, sheetName: string, order: number) => void;
  onEdit: (index: number, tableKey: string, sheetName: string, order: number) => void;
}) {
  const isEdit = mode !== 'add';
  const index = isEdit ? (mode as { edit: number }).edit : 0;
  const existing = isEdit ? schema.tables[index] : null;
  const [tableKey, setTableKey] = useState(existing?.tableKey ?? '');
  const [sheetName, setSheetName] = useState(existing?.sheetName ?? '');
  const [order, setOrder] = useState(existing?.order ?? schema.tables.length);

  useEffect(() => {
    if (existing) {
      setTableKey(existing.tableKey);
      setSheetName(existing.sheetName);
      setOrder(existing.order ?? index);
    } else {
      setTableKey('');
      setSheetName('');
      setOrder(schema.tables.length);
    }
  }, [existing, index, schema.tables.length]);

  const sheetNameError = (() => {
    if (!sheetName.trim()) return 'Sheet name is required.';
    if (sheetName.length > SHEET_NAME_MAX) return `Max ${SHEET_NAME_MAX} characters.`;
    if (SHEET_NAME_FORBIDDEN.test(sheetName)) return 'Cannot contain \\ / ? * [ ]';
    return null;
  })();
  const tableKeyError = !tableKey.trim() ? 'Table key is required.' : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sheetNameError || tableKeyError) return;
    if (isEdit) onEdit(index, tableKey, sheetName, order);
    else onAdd(tableKey, sheetName, order);
  };

  return (
    <Modal open={true} title={isEdit ? 'Edit table' : 'Add table'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Table key *</label>
          <input
            type="text"
            value={tableKey}
            onChange={(e) => setTableKey(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            placeholder="e.g. main_data"
          />
          {tableKeyError && <p className="mt-1 text-xs text-red-600">{tableKeyError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Sheet name *</label>
          <input
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Excel sheet name (max 31 chars)"
          />
          {sheetNameError && <p className="mt-1 text-xs text-red-600">{sheetNameError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Order</label>
          <input
            type="number"
            min={0}
            value={order}
            onChange={(e) => setOrder(Number(e.target.value) || 0)}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!!(sheetNameError || tableKeyError)}>{isEdit ? 'Save' : 'Add'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function FieldModal({
  table,
  mode,
  onClose,
  onAdd,
  onEdit,
}: {
  table: TableDefinition;
  mode: 'add' | { edit: number };
  onClose: () => void;
  onAdd: (f: FieldDefinition) => void;
  onEdit: (index: number, f: FieldDefinition) => void;
}) {
  const isEdit = mode !== 'add';
  const index = isEdit ? (mode as { edit: number }).edit : 0;
  const existing = isEdit ? (table.fields ?? [])[index] : null;
  const [fieldKey, setFieldKey] = useState(existing?.fieldKey ?? '');
  const [headerName, setHeaderName] = useState(existing?.headerName ?? '');
  const [type, setType] = useState(existing?.type ?? 'TEXT');
  const [required, setRequired] = useState(existing?.required ?? false);
  const [enumStr, setEnumStr] = useState((existing?.validations?.enum ?? []).join(', '));
  const [min, setMin] = useState(existing?.validations?.min ?? '');
  const [max, setMax] = useState(existing?.validations?.max ?? '');

  useEffect(() => {
    if (existing) {
      setFieldKey(existing.fieldKey);
      setHeaderName(existing.headerName);
      setType(existing.type ?? 'TEXT');
      setRequired(Boolean(existing.required));
      setEnumStr((existing.validations?.enum ?? []).join(', '));
      setMin(existing.validations?.min ?? '');
      setMax(existing.validations?.max ?? '');
    } else {
      setFieldKey('');
      setHeaderName('');
      setType('TEXT');
      setRequired(false);
      setEnumStr('');
      setMin('');
      setMax('');
    }
  }, [existing]);

  const minNum = min === '' ? undefined : Number(min);
  const maxNum = max === '' ? undefined : Number(max);
  const rangeError = minNum != null && maxNum != null && minNum > maxNum ? 'min must be ≤ max' : null;
  const fieldKeyError = !fieldKey.trim() ? 'Field key is required.' : null;
  const headerError = !headerName.trim() ? 'Header name is required.' : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fieldKeyError || headerError || rangeError) return;
    const validations: FieldValidations = {};
    const enumArr = enumStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (enumArr.length) validations.enum = enumArr;
    if (minNum != null && !Number.isNaN(minNum)) validations.min = minNum;
    if (maxNum != null && !Number.isNaN(maxNum)) validations.max = maxNum;
    const field: FieldDefinition = {
      fieldKey: fieldKey.trim(),
      headerName: headerName.trim(),
      type: type.trim(),
      required,
      validations: Object.keys(validations).length ? validations : undefined,
    };
    if (isEdit) onEdit(index, field);
    else onAdd(field);
  };

  return (
    <Modal open={true} title={isEdit ? 'Edit field' : 'Add field'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Field key *</label>
          <input
            type="text"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            placeholder="e.g. amount"
          />
          {fieldKeyError && <p className="mt-1 text-xs text-red-600">{fieldKeyError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Header name *</label>
          <input
            type="text"
            value={headerName}
            onChange={(e) => setHeaderName(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Column header in Excel"
          />
          {headerError && <p className="mt-1 text-xs text-red-600">{headerError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="TEXT">TEXT</option>
            <option value="NUMBER">NUMBER</option>
            <option value="CURRENCY">CURRENCY</option>
            <option value="DATE">DATE</option>
            <option value="BOOLEAN">BOOLEAN</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="field-required" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          <label htmlFor="field-required" className="text-sm text-neutral-700">Required</label>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Validations</label>
          <div className="space-y-2 text-sm">
            <div>
              <label className="text-neutral-600">Enum (comma-separated)</label>
              <input
                type="text"
                value={enumStr}
                onChange={(e) => setEnumStr(e.target.value)}
                className="mt-0.5 w-full rounded border border-neutral-300 px-2 py-1"
                placeholder="A, B, C"
              />
            </div>
            <div className="flex gap-2">
              <div>
                <label className="text-neutral-600">Min</label>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  className="mt-0.5 w-full rounded border border-neutral-300 px-2 py-1"
                />
              </div>
              <div>
                <label className="text-neutral-600">Max</label>
                <input
                  type="number"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  className="mt-0.5 w-full rounded border border-neutral-300 px-2 py-1"
                />
              </div>
            </div>
            {rangeError && <p className="text-xs text-red-600">{rangeError}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!!(fieldKeyError || headerError || rangeError)}>{isEdit ? 'Save' : 'Add'}</Button>
        </div>
      </form>
    </Modal>
  );
}
