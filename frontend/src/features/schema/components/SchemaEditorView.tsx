import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
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
import { buildSchemaPayloadForUpdate } from '../lib/buildSchemaPayload';
import { validateSchema, sanitizeValidationsByType } from '../lib/validateSchema';
import {
  ActionButton,
  ActionLink,
  DangerActionButton,
  IconArrowLeft,
  IconDelete,
  IconEdit,
} from '@/shared/ui/ActionButtons';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/ui/resizable';
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

export interface SchemaEditorViewProps {
  templateId: string;
  versionId: string;
  backPath: string;
  backLabel?: string;
  saveSuccessPath?: string;
  /** When true, hides top bar (ActionLink + PageHeader) and renders a bottom action bar with Back + Cancel + Save. */
  variant?: 'default' | 'wizard';
}

/** Reusable schema editor UI. Accepts templateId/versionId as props (no route params). */
export function SchemaEditorView({
  templateId,
  versionId,
  backPath,
  backLabel = 'Back to template details',
  saveSuccessPath,
  variant = 'default',
}: SchemaEditorViewProps) {
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
  /** Stable selection by tableKey so field CRUD and table switch don't get out of sync. */
  const [selectedTableKey, setSelectedTableKey] = useState<string | null>(null);
  const [tableModal, setTableModal] = useState<'add' | { edit: number } | null>(null);
  const [fieldModal, setFieldModal] = useState<'add' | { edit: string } | null>(null);
  /** Table key when field modal was opened, so switching selection does not change modal target. */
  const [fieldModalTableKey, setFieldModalTableKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<'table' | 'field' | null>(null);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);
  const [deleteTargetFieldKey, setDeleteTargetFieldKey] = useState<string | null>(null);
  const [deleteTargetTableKey, setDeleteTargetTableKey] = useState<string | null>(null);
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(schema.tables) !== JSON.stringify(initialSchemaRef.current.tables),
    [schema.tables]
  );

  const loadVersion = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await versionsApi.getById(versionId);
      setVersion(data);
      const parsed = parseSchemaJson(data.schemaJson);
      setSchema(parsed);
      initialSchemaRef.current = JSON.parse(JSON.stringify(parsed));
      setSelectedTableKey(parsed.tables.length > 0 ? parsed.tables[0].tableKey : null);
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

  const needsStartOverConfirm = variant === 'wizard' && backPath === '/templates/create';

  const goBack = useCallback(() => {
    if (dirty && !window.confirm('You have unsaved changes. Leave?')) return;
    if (needsStartOverConfirm) {
      setShowStartOverConfirm(true);
      return;
    }
    navigate(backPath);
  }, [dirty, navigate, backPath, needsStartOverConfirm]);

  const handleStartOverConfirm = useCallback(() => {
    setShowStartOverConfirm(false);
    navigate(backPath);
  }, [navigate, backPath]);

  const validationErrors = useMemo(() => validateSchema(schema.tables), [schema.tables]);
  const canSave = validationErrors.length === 0;

  const handleSave = async () => {
    if (!canSave) return;
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
      const payload = buildSchemaPayloadForUpdate(mergedSchema);
      await versionsApi.updateSchema(versionId, payload);
      showToast('Schema saved.', 'success');
      initialSchemaRef.current = JSON.parse(JSON.stringify(schema));
      navigate(saveSuccessPath ?? backPath);
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
    if (needsStartOverConfirm) {
      setShowStartOverConfirm(true);
      return;
    }
    navigate(backPath);
  };

  const updateTables = useCallback((updater: (prev: TableDefinition[]) => TableDefinition[]) => {
    setSchema((prev) => ({ ...prev, tables: updater(prev.tables) }));
  }, []);

  const selectedTable = useMemo(
    () => (selectedTableKey != null ? schema.tables.find((t) => t.tableKey === selectedTableKey) ?? null : null),
    [schema.tables, selectedTableKey]
  );
  const selectedTableIndex = useMemo(
    () => (selectedTableKey != null ? schema.tables.findIndex((t) => t.tableKey === selectedTableKey) : -1),
    [schema.tables, selectedTableKey]
  );

  const addTable = useCallback(
    (tableKey: string, sheetName: string, order: number, defaultFields?: { year?: boolean; month?: boolean; productName?: boolean }) => {
      const fields: FieldDefinition[] = [];
      if (defaultFields?.year) fields.push({ fieldKey: 'year', headerName: 'Year', type: 'NUMBER', required: true });
      if (defaultFields?.month) fields.push({ fieldKey: 'month', headerName: 'Month', type: 'TEXT', required: true });
      if (defaultFields?.productName) fields.push({ fieldKey: 'product_name', headerName: 'Product Name', type: 'TEXT', required: true });
      const newTable: TableDefinition = {
        tableKey: tableKey.trim(),
        sheetName: sheetName.trim(),
        order,
        fields,
      };
      updateTables((prev) => [...prev, newTable]);
      setSelectedTableKey(newTable.tableKey);
      setTableModal(null);
    },
    [updateTables]
  );

  const editTable = useCallback(
    (index: number, tableKey: string, sheetName: string, order: number) => {
      updateTables((prev) => {
        const next = [...prev];
        const t = next[index];
        if (t) next[index] = { ...t, tableKey: tableKey.trim(), sheetName: sheetName.trim(), order };
        return next;
      });
      if (selectedTableKey === schema.tables[index]?.tableKey) {
        setSelectedTableKey(tableKey.trim());
      }
      setTableModal(null);
    },
    [updateTables, selectedTableKey, schema.tables]
  );

  const deleteTable = useCallback(
    (index: number) => {
      const removedKey = schema.tables[index]?.tableKey ?? null;
      const nextTables = schema.tables.filter((_, i) => i !== index);
      updateTables(() => nextTables);
      if (selectedTableKey === removedKey) {
        setSelectedTableKey(nextTables.length > 0 ? nextTables[0].tableKey : null);
      }
      setConfirmDelete(null);
      setDeleteTargetIndex(null);
    },
    [schema.tables, selectedTableKey, updateTables]
  );

  const addField = useCallback(
    (field: FieldDefinition) => {
      const tableKey = fieldModalTableKey ?? selectedTableKey;
      if (tableKey == null) return;
      updateTables((prev) => {
        const idx = prev.findIndex((t) => t.tableKey === tableKey);
        if (idx < 0) return prev;
        const next = [...prev];
        const t = next[idx];
        if (!t) return prev;
        next[idx] = { ...t, fields: [...(t.fields ?? []), field] };
        return next;
      });
      setFieldModal(null);
      setFieldModalTableKey(null);
    },
    [fieldModalTableKey, selectedTableKey, updateTables]
  );

  const editField = useCallback(
    (previousFieldKey: string, field: FieldDefinition) => {
      const tableKey = fieldModalTableKey ?? selectedTableKey;
      if (tableKey == null) return;
      updateTables((prev) => {
        const idx = prev.findIndex((t) => t.tableKey === tableKey);
        if (idx < 0) return prev;
        const next = [...prev];
        const t = next[idx];
        if (!t) return prev;
        const fields = (t.fields ?? []).map((f) => (f.fieldKey === previousFieldKey ? field : f));
        next[idx] = { ...t, fields };
        return next;
      });
      setFieldModal(null);
      setFieldModalTableKey(null);
    },
    [fieldModalTableKey, selectedTableKey, updateTables]
  );

  const deleteField = useCallback(
    (tableKey: string, fieldKey: string) => {
      updateTables((prev) => {
        const idx = prev.findIndex((t) => t.tableKey === tableKey);
        if (idx < 0) return prev;
        const next = [...prev];
        const t = next[idx];
        if (!t) return prev;
        next[idx] = { ...t, fields: (t.fields ?? []).filter((f) => f.fieldKey !== fieldKey) };
        return next;
      });
      setConfirmDelete(null);
      setDeleteTargetFieldKey(null);
      setDeleteTargetTableKey(null);
    },
    [updateTables]
  );

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
          <Button variant="secondary" onClick={goBack}>{backLabel}</Button>
        </div>
      </div>
    );
  }
  if (!version) {
    return <div className="text-sm text-neutral-600">Version not found.</div>;
  }

  const is409 = saveError?.status === 409;
  const readOnly = is409;

  const topBar =
    variant === 'wizard' ? null : (
      <div className="space-y-2">
        <ActionLink to={backPath}>
          <IconArrowLeft />
          {backLabel}
        </ActionLink>
        <PageHeader
          title="Schema Editor"
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
    );

  const bottomBar =
    variant === 'wizard' ? (
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <Button variant="secondary" onClick={goBack} disabled={readOnly || saving}>
          <IconArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
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
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {topBar}

      {is409 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
          <p className="font-medium">Only the latest version is editable. This version is read-only.</p>
          <p className="mt-1 text-amber-700">
            <ActionLink to={backPath}>
              <IconArrowLeft />
              {backLabel}
            </ActionLink>
          </p>
        </div>
      )}

      <TableLoadingOverlay loading={saving} className="min-h-[360px] w-full">
        <Card className="min-h-[360px] overflow-hidden">
          <ResizablePanelGroup orientation="horizontal" className="min-h-[360px] w-full">
            <ResizablePanel defaultSize={35} minSize={20} className="min-w-0">
              <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                <div className="flex shrink-0 flex-row items-center justify-between p-4 pb-2">
                  <h2 className="text-sm font-medium text-muted-foreground">Tables</h2>
                  {!readOnly && schema.tables.length > 0 && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setTableModal('add')} disabled={saving}>
                      Add table
                    </Button>
                  )}
                </div>
                <div className="min-h-0 min-w-0 flex-1 overflow-auto px-4 pb-4 pt-0">
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
                    <ul className="min-w-0 space-y-1 overflow-x-auto">
                      {schema.tables.map((t, i) => (
                        <li key={t.tableKey} className="min-w-0">
                          <div
                            className={`flex min-w-0 items-center justify-between rounded px-2 py-1.5 text-sm ${
                              selectedTableKey === t.tableKey ? 'bg-neutral-100 font-medium' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 truncate text-left"
                              onClick={() => setSelectedTableKey(t.tableKey)}
                            >
                              {t.tableKey} <span className="text-neutral-500">({t.sheetName})</span>
                            </button>
                            {!readOnly && (
                              <span className="flex shrink-0 items-center gap-1">
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
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className=" shadow-none after:w-2" />
            <ResizablePanel defaultSize={65} minSize={40} className="min-w-0">
              <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                <div className="flex shrink-0 flex-row items-center justify-between p-4 pb-2">
                  <h2 className="min-w-0 truncate text-sm font-medium text-muted-foreground">
                    Fields {selectedTable ? `· ${selectedTable.tableKey}` : ''}
                  </h2>
                  {selectedTable && !readOnly && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => { setFieldModal('add'); setFieldModalTableKey(selectedTableKey ?? null); }}
                      disabled={saving}
                    >
                      Add field
                    </Button>
                  )}
                </div>
                <div className="min-h-0 min-w-0 flex-1 overflow-auto px-4 pb-4 pt-0">
                  {selectedTable ? (
                    (selectedTable.fields ?? []).length === 0 ? (
                      <EmptyState
                        title="No fields yet"
                        description={`Add fields to the "${selectedTable.tableKey}" table.`}
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {(selectedTable.fields ?? []).map((f) => (
                          <div
                            key={f.fieldKey}
                            className="group relative rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                          >
                            <div className="pr-16 min-w-0">
                              <p className="truncate font-medium text-neutral-900">{f.headerName}</p>
                              <p className="mt-0.5 font-mono text-xs text-neutral-500">{f.fieldKey}</p>
                              <p className="mt-0.5 text-xs text-neutral-600">{f.type}</p>
                              {f.required && (
                                <span className="mt-1 inline-block text-xs font-medium text-amber-700">* Required</span>
                              )}
                            </div>
                            {!readOnly && (
                              <span className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <ActionButton
                                  as="button"
                                  aria-label="Edit field"
                                  label="Edit"
                                  onClick={() => { setFieldModal({ edit: f.fieldKey }); setFieldModalTableKey(selectedTableKey ?? null); }}
                                >
                                  <IconEdit />
                                </ActionButton>
                                <DangerActionButton
                                  aria-label="Delete field"
                                  label="Delete"
                                  onClick={() => { setConfirmDelete('field'); setDeleteTargetFieldKey(f.fieldKey); setDeleteTargetTableKey(selectedTableKey ?? null); }}
                                >
                                  <IconDelete />
                                </DangerActionButton>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a table to view fields.</p>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </Card>
      </TableLoadingOverlay>

      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4" role="alert">
          <h3 className="text-sm font-medium text-amber-800">Fix schema errors before saving</h3>
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
            {JSON.stringify(buildSchemaPayloadForUpdate(schema), null, 2)}
          </pre>
        )}
      </div>

      {tableModal && (
        <TableModal
          schema={schema}
          mode={tableModal}
          onClose={() => setTableModal(null)}
          onAdd={addTable}
          onEdit={editTable}
        />
      )}

      {fieldModal !== null && (() => {
        const tableForModal = fieldModalTableKey != null ? schema.tables.find((t) => t.tableKey === fieldModalTableKey) ?? null : null;
        return tableForModal != null && (
          <FieldModal
            table={tableForModal}
            mode={fieldModal}
            onClose={() => { setFieldModal(null); setFieldModalTableKey(null); }}
            onAdd={addField}
            onEdit={editField}
          />
        );
      })()}

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
      {confirmDelete === 'field' && deleteTargetFieldKey != null && deleteTargetTableKey != null && (
        <Modal open={true} title="Delete field?" onClose={() => { setConfirmDelete(null); setDeleteTargetFieldKey(null); setDeleteTargetTableKey(null); }}>
          <p className="text-sm text-neutral-700">
            Delete field &quot;{deleteTargetFieldKey}&quot;?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setConfirmDelete(null); setDeleteTargetFieldKey(null); setDeleteTargetTableKey(null); }}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteField(deleteTargetTableKey, deleteTargetFieldKey)}>Delete</Button>
          </div>
        </Modal>
      )}

      {showStartOverConfirm && (
        <Modal open={true} title="Start over?" onClose={() => setShowStartOverConfirm(false)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can&apos;t edit Template Name or Sector Code after creation. Going back will start a new template and your
              current template will remain as-is.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowStartOverConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleStartOverConfirm}>
                Start over
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {bottomBar}
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
  onAdd: (tableKey: string, sheetName: string, order: number, defaultFields?: { year?: boolean; month?: boolean; productName?: boolean }) => void;
  onEdit: (index: number, tableKey: string, sheetName: string, order: number) => void;
}) {
  const isEdit = mode !== 'add';
  const index = isEdit ? (mode as { edit: number }).edit : 0;
  const existing = isEdit ? schema.tables[index] : null;
  const [tableKey, setTableKey] = useState(existing?.tableKey ?? '');
  const [sheetName, setSheetName] = useState(existing?.sheetName ?? '');
  const [order, setOrder] = useState(existing?.order ?? schema.tables.length);
  const [defaultYear, setDefaultYear] = useState(true);
  const [defaultMonth, setDefaultMonth] = useState(true);
  const [defaultProductName, setDefaultProductName] = useState(true);
  const [touched, setTouched] = useState<Record<'tableKey' | 'sheetName' | 'order', boolean>>({
    tableKey: false,
    sheetName: false,
    order: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (existing) {
      setTableKey(existing.tableKey);
      setSheetName(existing.sheetName);
      setOrder(existing.order ?? index);
    } else {
      setTableKey('');
      setSheetName('');
      setOrder(schema.tables.length);
      setDefaultYear(true);
      setDefaultMonth(true);
      setDefaultProductName(true);
    }
    setTouched({ tableKey: false, sheetName: false, order: false });
    setSubmitAttempted(false);
  }, [existing, index, schema.tables.length]);

  const otherTables = schema.tables.filter((_, i) => i !== index);
  const tableKeyError = (() => {
    if (!tableKey.trim()) return 'Table key is required.';
    const key = tableKey.trim().toLowerCase();
    if (otherTables.some((t) => t.tableKey.trim().toLowerCase() === key)) return 'Table key must be unique across the schema.';
    return null;
  })();
  const sheetNameError = (() => {
    const trimmed = sheetName.trim();
    if (!trimmed) return 'Sheet name is required.';
    if (trimmed.length > SHEET_NAME_MAX) return `Max ${SHEET_NAME_MAX} characters.`;
    if (SHEET_NAME_FORBIDDEN.test(trimmed)) return 'Cannot contain \\ / ? * [ ]';
    const normalized = trimmed.toLowerCase();
    if (otherTables.some((t) => t.sheetName.trim().toLowerCase() === normalized)) return 'Sheet name must be unique (after trimming).';
    return null;
  })();

  const showTableKeyError = (touched.tableKey || submitAttempted) && tableKeyError;
  const showSheetNameError = (touched.sheetName || submitAttempted) && sheetNameError;
  const canSubmit = !tableKeyError && !sheetNameError;
  const addDisabled = !tableKey.trim() || !sheetName.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!canSubmit) return;
    if (isEdit) onEdit(index, tableKey.trim(), sheetName.trim(), order);
    else onAdd(tableKey.trim(), sheetName.trim(), order, { year: defaultYear, month: defaultMonth, productName: defaultProductName });
  };

  return (
    <Modal open={true} title={isEdit ? 'Edit table' : 'Add table'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Table key *</label>
          <Input
            type="text"
            value={tableKey}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setTableKey(e.target.value);
              setTouched((t) => ({ ...t, tableKey: true }));
            }}
            onBlur={() => setTouched((t) => ({ ...t, tableKey: true }))}
            placeholder="e.g. main_data"
          />
          {showTableKeyError && <p className="mt-1 text-xs text-red-600">{tableKeyError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Sheet name *</label>
          <Input
            type="text"
            value={sheetName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSheetName(e.target.value);
              setTouched((t) => ({ ...t, sheetName: true }));
            }}
            onBlur={() => setTouched((t) => ({ ...t, sheetName: true }))}
            placeholder="Excel sheet name (max 31 chars)"
          />
          {showSheetNameError && <p className="mt-1 text-xs text-red-600">{sheetNameError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Order</label>
          <Input
            type="number"
            min={0}
            value={order}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setOrder(Number(e.target.value) || 0);
              setTouched((t) => ({ ...t, order: true }));
            }}
          />
        </div>
        {!isEdit && (
          <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
            <p className="mb-2 text-sm font-medium text-neutral-700">Add default fields</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={defaultYear} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDefaultYear(e.target.checked)} />
                Year Field
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={defaultMonth} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDefaultMonth(e.target.checked)} />
                Month Field
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={defaultProductName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDefaultProductName(e.target.checked)} />
                Product Name Field
              </label>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={addDisabled}>{isEdit ? 'Save' : 'Add'}</Button>
        </div>
      </form>
    </Modal>
  );
}

type FieldModalTouched = Record<'fieldKey' | 'headerName' | 'type' | 'validations.enum' | 'validations.min' | 'validations.max', boolean>;

function FieldModal({
  table,
  mode,
  onClose,
  onAdd,
  onEdit,
}: {
  table: TableDefinition;
  mode: 'add' | { edit: string };
  onClose: () => void;
  onAdd: (f: FieldDefinition) => void;
  onEdit: (previousFieldKey: string, f: FieldDefinition) => void;
}) {
  const isEdit = mode !== 'add';
  const editFieldKey = isEdit ? (mode as { edit: string }).edit : '';
  const existing = isEdit ? (table.fields ?? []).find((f) => f.fieldKey === editFieldKey) ?? null : null;
  const [fieldKey, setFieldKey] = useState(existing?.fieldKey ?? '');
  const [headerName, setHeaderName] = useState(existing?.headerName ?? '');
  const [type, setType] = useState(existing?.type ?? 'TEXT');
  const [required, setRequired] = useState(existing?.required ?? false);
  const [enumStr, setEnumStr] = useState((existing?.validations?.enum ?? []).join(', '));
  const [min, setMin] = useState<string | number>(existing?.validations?.min ?? '');
  const [max, setMax] = useState<string | number>(existing?.validations?.max ?? '');
  const [touched, setTouched] = useState<FieldModalTouched>({
    'fieldKey': false,
    'headerName': false,
    'type': false,
    'validations.enum': false,
    'validations.min': false,
    'validations.max': false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [autoCleanHint, setAutoCleanHint] = useState<string | null>(null);

  const clearAutoCleanHint = () => {
    if (autoCleanHint) setAutoCleanHint(null);
  };

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
    setTouched({
      'fieldKey': false,
      'headerName': false,
      'type': false,
      'validations.enum': false,
      'validations.min': false,
      'validations.max': false,
    });
    setSubmitAttempted(false);
    setAutoCleanHint(null);
  }, [existing]);

  const handleTypeChange = (newType: string) => {
    const prevType = type.trim().toUpperCase();
    setType(newType);
    setTouched((t) => ({ ...t, type: true }));
    const currentValidations: FieldValidations = {};
    const enumArr = enumStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (enumArr.length) currentValidations.enum = enumArr;
    const minVal = min === '' ? undefined : Number(min);
    const maxVal = max === '' ? undefined : Number(max);
    if (minVal != null && !Number.isNaN(minVal)) currentValidations.min = minVal;
    if (maxVal != null && !Number.isNaN(maxVal)) currentValidations.max = maxVal;
    const cleaned = sanitizeValidationsByType(newType, currentValidations);
    const nextType = newType.trim().toUpperCase();
    if (nextType === 'TEXT' && (prevType === 'NUMBER' || prevType === 'CURRENCY' || prevType === 'DATE' || prevType === 'BOOLEAN')) {
      setMin('');
      setMax('');
      setAutoCleanHint('Cleared min/max because type is TEXT.');
    } else if ((nextType === 'NUMBER' || nextType === 'CURRENCY') && prevType === 'TEXT') {
      setEnumStr('');
      setAutoCleanHint('Cleared enum because type is NUMBER/CURRENCY.');
    } else if (nextType === 'DATE' || nextType === 'BOOLEAN') {
      setEnumStr('');
      setMin('');
      setMax('');
      setAutoCleanHint('Cleared enum and min/max because type is DATE/BOOLEAN.');
    } else {
      setEnumStr((cleaned?.enum ?? []).join(', '));
      setMin(cleaned?.min ?? '');
      setMax(cleaned?.max ?? '');
    }
  };

  const minNum = min === '' ? undefined : Number(min);
  const maxNum = max === '' ? undefined : Number(max);
  const normalizedType = type.trim().toUpperCase();
  const enumArr = enumStr.split(',').map((s) => s.trim()).filter(Boolean);
  const hasEnum = enumArr.length > 0;
  const hasMinMax = minNum != null && !Number.isNaN(minNum) || maxNum != null && !Number.isNaN(maxNum);

  const rangeError = minNum != null && maxNum != null && !Number.isNaN(minNum) && !Number.isNaN(maxNum) && minNum > maxNum
    ? 'min must be ≤ max'
    : null;
  const enumTypeError = hasEnum && normalizedType !== 'TEXT' ? 'Enum is only allowed for type TEXT.' : null;
  const minMaxTypeError = hasMinMax && normalizedType !== 'NUMBER' && normalizedType !== 'CURRENCY'
    ? 'Min/max only allowed for NUMBER or CURRENCY.'
    : null;

  const otherFields = (table.fields ?? []).filter((f) => f.fieldKey !== editFieldKey);
  const fieldKeyError = (() => {
    if (!fieldKey.trim()) return 'Field key is required.';
    const key = fieldKey.trim().toLowerCase();
    if (otherFields.some((f) => f.fieldKey.trim().toLowerCase() === key)) return 'Field key must be unique within this table.';
    return null;
  })();
  const headerError = !headerName.trim() ? 'Header name is required.' : null;
  const validationsError = enumTypeError || minMaxTypeError || rangeError;

  const showFieldKeyError = (touched['fieldKey'] || submitAttempted) && fieldKeyError;
  const showHeaderError = (touched['headerName'] || submitAttempted) && headerError;
  const showValidationsError = (touched['validations.enum'] || touched['validations.min'] || touched['validations.max'] || submitAttempted) && validationsError;
  const canSubmit = !fieldKeyError && !headerError && !validationsError;
  const addDisabled = !fieldKey.trim() || !headerName.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!canSubmit) return;
    const validations: FieldValidations = {};
    if (enumArr.length && normalizedType === 'TEXT') validations.enum = enumArr;
    if ((normalizedType === 'NUMBER' || normalizedType === 'CURRENCY') && minNum != null && !Number.isNaN(minNum)) validations.min = minNum;
    if ((normalizedType === 'NUMBER' || normalizedType === 'CURRENCY') && maxNum != null && !Number.isNaN(maxNum)) validations.max = maxNum;
    const sanitized = sanitizeValidationsByType(type, validations);
    const field: FieldDefinition = {
      fieldKey: fieldKey.trim(),
      headerName: headerName.trim(),
      type: type.trim(),
      required,
      validations: sanitized && Object.keys(sanitized).length ? sanitized : undefined,
    };
    if (isEdit && editFieldKey) onEdit(editFieldKey, field);
    else onAdd(field);
  };

  return (
    <Modal open={true} title={isEdit ? 'Edit field' : 'Add field'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Field key</label>
          <Input
            type="text"
            value={fieldKey}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setFieldKey(e.target.value);
              setTouched((t) => ({ ...t, fieldKey: true }));
            }}
            onBlur={() => setTouched((t) => ({ ...t, fieldKey: true }))}
            placeholder="e.g. amount"
          />
          {showFieldKeyError && <p className="mt-1 text-xs text-red-600">{fieldKeyError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Header name</label>
          <Input
            type="text"
            value={headerName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setHeaderName(e.target.value);
              setTouched((t) => ({ ...t, headerName: true }));
            }}
            onBlur={() => setTouched((t) => ({ ...t, headerName: true }))}
            placeholder="Column header in Excel"
          />
          {showHeaderError && <p className="mt-1 text-xs text-red-600">{headerError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Type</label>
          <Select value={type} onValueChange={handleTypeChange}>
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
          {autoCleanHint && (
            <p className="mb-1 text-xs text-muted-foreground" role="status">{autoCleanHint}</p>
          )}
          {normalizedType === 'BOOLEAN' && (
            <p className="text-sm text-neutral-600">This field will export as a Yes/No dropdown.</p>
          )}
          <div className="space-y-2 text-sm">
            {normalizedType === 'TEXT' && (
              <div>
                <label className="text-neutral-600">Enum (comma-separated)</label>
                <Input
                  type="text"
                  value={enumStr}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEnumStr(e.target.value);
                    setTouched((t) => ({ ...t, 'validations.enum': true }));
                    clearAutoCleanHint();
                  }}
                  onFocus={clearAutoCleanHint}
                  className="mt-0.5"
                  placeholder="A, B, C"
                />
              </div>
            )}
            {(normalizedType === 'NUMBER' || normalizedType === 'CURRENCY') && (
              <div className="flex gap-2">
                <div>
                  <label className="text-neutral-600">Min</label>
                  <Input
                    type="number"
                    value={min}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setMin(e.target.value);
                      setTouched((t) => ({ ...t, 'validations.min': true }));
                      clearAutoCleanHint();
                    }}
                    className="mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-neutral-600">Max</label>
                  <Input
                    type="number"
                    value={max}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setMax(e.target.value);
                      setTouched((t) => ({ ...t, 'validations.max': true }));
                      clearAutoCleanHint();
                    }}
                    className="mt-0.5"
                  />
                </div>
              </div>
            )}
            {showValidationsError && validationsError && <p className="text-xs text-red-600">{validationsError}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={addDisabled}>{isEdit ? 'Save' : 'Add'}</Button>
        </div>
      </form>
    </Modal>
  );
}
