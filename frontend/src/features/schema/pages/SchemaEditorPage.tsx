import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBreadcrumb } from '@/app/layout/BreadcrumbContext';
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
import { Card, CardContent, CardHeader } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import {
  Table as DataTable,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from '@/shared/ui/Table';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { TableLoadingOverlay } from '@/shared/ui/TableLoadingOverlay';
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
  const { showToast, showErrorToast } = useToast();
  const breadcrumb = useBreadcrumb();
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
      const err = normalizeHttpError(e);
      setLoadError(err);
      setVersion(null);
      showErrorToast(getErrorMessage(err, true), {
        status: err.status,
        details: getErrorMessage(err, true),
        onRetry: loadVersion,
      });
    } finally {
      setLoading(false);
    }
  }, [versionId, showErrorToast]);

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
    if (templateInfo != null && version != null) {
      breadcrumb?.setBreadcrumb({
        templateName: templateInfo.name,
        versionNumber: version.versionNumber,
      });
    }
    return () => {
      breadcrumb?.setBreadcrumb({ templateName: null, versionNumber: null });
    };
  }, [templateInfo, version, breadcrumb]);

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
      showErrorToast(getErrorMessage(err, true), {
        status: err.status,
        details: getErrorMessage(err, true),
      });
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
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Failed to load version.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadVersion}>Retry</Button>
          <Button variant="secondary" onClick={goBack}>Back to template</Button>
        </div>
      </div>
    );
  }
  if (!version) {
    return <div className="text-sm text-neutral-600">Version not found.</div>;
  }

  const is409 = saveError?.status === 409;
  const readOnly = is409;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <ActionLink to={templateDetailsPath}>
          <IconArrowLeft />
          Back to template details
        </ActionLink>
        <PageHeader
          description={`Version ${version.versionNumber}`}
          rightActions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCancel} disabled={readOnly || saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || readOnly || !canSave}>
                {saving ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          }
        />
      </div>

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

      <TableLoadingOverlay loading={saving} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <h2 className="text-sm font-medium text-muted-foreground">Tables</h2>
            {!readOnly && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setTableModal('add')} disabled={saving}>
                Add table
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {schema.tables.length === 0 ? (
              <EmptyState
                title="No tables yet"
                description="Add a table to define your schema."
                action={
                  !readOnly ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setTableModal('add')} disabled={saving}>
                      Add table
                    </Button>
                  ) : undefined
                }
              />
            ) : (
          <ul className="space-y-1">
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
                        label="Edit"
                        onClick={() => setTableModal({ edit: i })}
                      >
                        <IconEdit />
                      </ActionButton>
                      <DangerActionButton
                        aria-label="Delete table"
                        label="Delete"
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
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="p-4 pb-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Fields {selectedTable ? `· ${selectedTable.tableKey}` : ''}
            </h2>
          </CardHeader>
          <CardContent className="p-4 pt-0">
          {selectedTable ? (
            (selectedTable.fields ?? []).length === 0 ? (
              <EmptyState
                title="No fields yet"
                description={`Add fields to the "${selectedTable.tableKey}" table.`}
                action={
                  !readOnly ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setFieldModal('add')} disabled={saving}>
                      Add field
                    </Button>
                  ) : undefined
                }
              />
            ) : (
            <>
              {!readOnly && (
                <Button type="button" variant="secondary" className="mb-3" onClick={() => setFieldModal('add')} disabled={saving}>
                  Add field
                </Button>
              )}
              <div className="overflow-x-auto">
                <DataTable className="text-sm">
                  <TableHead>
                    <TableRow>
                      <TableTh>Field key</TableTh>
                      <TableTh>Header</TableTh>
                      <TableTh>Type</TableTh>
                      <TableTh>Required</TableTh>
                      <TableTh>Validations</TableTh>
                      {!readOnly && <TableTh className="w-0">Actions</TableTh>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedTable.fields ?? []).map((f, fi) => (
                      <TableRow key={fi}>
                        <TableTd className="font-mono">{f.fieldKey}</TableTd>
                        <TableTd>{f.headerName}</TableTd>
                        <TableTd>{f.type}</TableTd>
                        <TableTd>{f.required ? 'Yes' : '—'}</TableTd>
                        <TableTd>
                          {f.validations?.enum?.length ? `enum(${f.validations.enum.length})` : ''}
                          {f.validations?.min != null && ` min=${f.validations.min}`}
                          {f.validations?.max != null && ` max=${f.validations.max}`}
                          {!f.validations?.enum?.length && f.validations?.min == null && f.validations?.max == null && '—'}
                        </TableTd>
                        {!readOnly && (
                          <TableTd>
                            <span className="flex items-center gap-2">
                              <ActionButton
                                as="button"
                                aria-label="Edit field"
                                label="Edit"
                                onClick={() => setFieldModal({ edit: fi })}
                              >
                                <IconEdit />
                              </ActionButton>
                              <DangerActionButton
                                aria-label="Delete field"
                                label="Delete"
                                onClick={() => { setConfirmDelete('field'); setDeleteTargetIndex(fi); }}
                              >
                                <IconDelete />
                              </DangerActionButton>
                            </span>
                          </TableTd>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTable>
              </div>
            </>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Select a table to edit its fields.</p>
          )}
          </CardContent>
        </Card>
      </TableLoadingOverlay>

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
          <Input
            type="text"
            value={tableKey}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableKey(e.target.value)}
            placeholder="e.g. main_data"
          />
          {tableKeyError && <p className="mt-1 text-xs text-red-600">{tableKeyError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Sheet name *</label>
          <Input
            type="text"
            value={sheetName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSheetName(e.target.value)}
            placeholder="Excel sheet name (max 31 chars)"
          />
          {sheetNameError && <p className="mt-1 text-xs text-red-600">{sheetNameError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Order</label>
          <Input
            type="number"
            min={0}
            value={order}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrder(Number(e.target.value) || 0)}
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
          <Input
            type="text"
            value={fieldKey}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldKey(e.target.value)}
            placeholder="e.g. amount"
          />
          {fieldKeyError && <p className="mt-1 text-xs text-red-600">{fieldKeyError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Header name *</label>
          <Input
            type="text"
            value={headerName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHeaderName(e.target.value)}
            placeholder="Column header in Excel"
          />
          {headerError && <p className="mt-1 text-xs text-red-600">{headerError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TEXT">TEXT</SelectItem>
              <SelectItem value="NUMBER">NUMBER</SelectItem>
              <SelectItem value="CURRENCY">CURRENCY</SelectItem>
              <SelectItem value="DATE">DATE</SelectItem>
              <SelectItem value="BOOLEAN">BOOLEAN</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="field-required" checked={required} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequired(e.target.checked)} />
          <label htmlFor="field-required" className="text-sm text-neutral-700">Required</label>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Validations</label>
          <div className="space-y-2 text-sm">
            <div>
              <label className="text-neutral-600">Enum (comma-separated)</label>
              <Input
                type="text"
                value={enumStr}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnumStr(e.target.value)}
                className="mt-0.5"
                placeholder="A, B, C"
              />
            </div>
            <div className="flex gap-2">
              <div>
                <label className="text-neutral-600">Min</label>
                <Input
                  type="number"
                  value={min}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMin(e.target.value)}
                  className="mt-0.5"
                />
              </div>
              <div>
                <label className="text-neutral-600">Max</label>
                <Input
                  type="number"
                  value={max}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMax(e.target.value)}
                  className="mt-0.5"
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
