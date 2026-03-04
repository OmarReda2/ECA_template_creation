import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templatesApi } from '../api';
import { versionsApi } from '@/features/versions/api';
import { exportVersion } from '@/features/export/api';
import type { ExportRequest } from '@/features/export/types';
import type { TemplateDetail } from '../types';
import type { SchemaDefinition, ExportProfile } from '@/features/schema/types';
import { TemplateWizardLayout } from '../components/TemplateWizardLayout';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Spinner } from '@/shared/ui/Spinner';
import { useToast } from '@/shared/ui/Toast';
import { downloadBlobWithDisposition } from '@/shared/lib/download';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/Tooltip';
import {
  normalizeHttpError,
  getErrorMessage,
  type FrontendError,
} from '@/shared/errors/errorTypes';

function parseSchema(schemaJson: unknown): SchemaDefinition {
  if (schemaJson == null || typeof schemaJson !== 'object') return { sectorCode: '', tables: [] };
  const o = schemaJson as Record<string, unknown>;
  const tables = Array.isArray(o.tables) ? o.tables as SchemaDefinition['tables'] : [];
  const exportProfile = (o.exportProfile != null && typeof o.exportProfile === 'object') ? o.exportProfile as ExportProfile : undefined;
  return {
    templateName: typeof o.templateName === 'string' ? o.templateName : undefined,
    sectorCode: typeof o.sectorCode === 'string' ? o.sectorCode : '',
    tables,
    exportProfile,
  };
}

function sanitizeFileName(name: string): string {
  const s = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return s.endsWith('.xlsx') ? s : s ? `${s}.xlsx` : '.xlsx';
}

function estimateFileSizeKb(tablesCount: number, fieldsCount: number): number {
  return Math.round(12 + tablesCount * 2 + fieldsCount * 0.5);
}

export default function CreateTemplateExportPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { showToast, showErrorToast } = useToast();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [schema, setSchema] = useState<SchemaDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FrontendError | null>(null);
  const [exporting, setExporting] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [includeInstructionsSheet, setIncludeInstructionsSheet] = useState(true);
  const [includeValidationRules, setIncludeValidationRules] = useState(true);
  const [protectSheets, setProtectSheets] = useState(false);
  const [fileName, setFileName] = useState('');

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await templatesApi.getById(templateId);
      setTemplate(data);
      const versions = data.versions ?? [];
      const latest = versions.length > 0
        ? versions.reduce((a, b) => (b.versionNumber ?? 0) > (a.versionNumber ?? 0) ? b : a)
        : null;
      if (latest) {
        const versionDetail = await versionsApi.getById(latest.id);
        const parsed = parseSchema(versionDetail.schemaJson);
        setSchema(parsed);
        const ep = parsed.exportProfile;
        setIncludeInstructionsSheet(ep?.includeInstructionsSheet ?? true);
        setIncludeValidationRules(ep?.includeValidationRules ?? true);
        setProtectSheets(ep?.protectSheets ?? false);
        setFileName(`${(parsed.templateName || data.name || 'template')}_v${latest.versionNumber}.xlsx`);
      } else {
        setSchema({ sectorCode: data.sectorCode ?? '', tables: [] });
        setFileName(`${data.name ?? 'template'}_v1.xlsx`);
      }
    } catch (e) {
      const err = normalizeHttpError(e);
      setError(err);
      setTemplate(null);
      setSchema(null);
      showErrorToast(getErrorMessage(err, true), {
        status: err.status,
        details: getErrorMessage(err, true),
        onRetry: loadTemplate,
      });
    } finally {
      setLoading(false);
    }
  }, [templateId, showErrorToast]);

  useEffect(() => {
    if (!templateId) {
      navigate('/templates/create', { replace: true });
      return;
    }
    loadTemplate();
  }, [templateId, navigate, loadTemplate]);

  const goToStep2 = () => navigate(`/templates/create/${templateId}`);
  const goToTemplates = () => navigate('/templates');

  const stats = useMemo(() => {
    const tablesCount = schema?.tables?.length ?? 0;
    const fieldsCount = schema?.tables?.reduce((sum, t) => sum + (t.fields?.length ?? 0), 0) ?? 0;
    return { tablesCount, fieldsCount, estimatedKb: estimateFileSizeKb(tablesCount, fieldsCount) };
  }, [schema]);

  const handleSaveSettings = useCallback(async () => {
    if (!template || !schema) return;
    const versions = template.versions ?? [];
    const latest = versions.length > 0 ? versions.reduce((a, b) => (b.versionNumber ?? 0) > (a.versionNumber ?? 0) ? b : a) : null;
    if (!latest) return;
    setSavingSettings(true);
    try {
      const payload = {
        ...(schema.templateName != null && { templateName: schema.templateName }),
        sectorCode: schema.sectorCode ?? '',
        tables: schema.tables,
        exportProfile: { format: 'XLSX', includeInstructionsSheet, includeValidationRules, protectSheets },
      };
      await versionsApi.updateSchema(latest.id, payload);
      setSchema((prev) => prev ? { ...prev, exportProfile: payload.exportProfile } : null);
      showToast('Export settings saved.', 'success');
    } catch (e) {
      const err = normalizeHttpError(e);
      showErrorToast(getErrorMessage(err, true), { status: err.status, details: getErrorMessage(err, true) });
    } finally {
      setSavingSettings(false);
    }
  }, [template, schema, includeInstructionsSheet, includeValidationRules, protectSheets, showToast, showErrorToast]);

  const handleExport = useCallback(async () => {
    if (!template) return;
    const versions = template.versions ?? [];
    if (versions.length === 0) return;
    const latest = versions.reduce((a, b) => (b.versionNumber ?? 0) > (a.versionNumber ?? 0) ? b : a);
    setExporting(true);
    try {
      const request: ExportRequest = {
        format: 'XLSX',
        fileName: fileName.trim() ? sanitizeFileName(fileName.trim()) : undefined,
        includeInstructionsSheet,
        includeValidationRules,
        protectSheets,
      };
      const { blob, contentDisposition } = await exportVersion(latest.id, request);
      const fallback = fileName.trim() ? sanitizeFileName(fileName.trim()) : `${template.name ?? 'template'}_v${latest.versionNumber}.xlsx`;
      downloadBlobWithDisposition(blob, contentDisposition, fallback);
      showToast('Export downloaded.', 'success');
    } catch (e) {
      const err = normalizeHttpError(e);
      showErrorToast(getErrorMessage(err, true), { status: err.status, details: getErrorMessage(err, true) });
    } finally {
      setExporting(false);
    }
  }, [template, fileName, includeInstructionsSheet, includeValidationRules, protectSheets, showToast, showErrorToast]);

  if (!templateId) {
    return null;
  }

  const versions = template?.versions ?? [];
  const latestVersion = versions.length > 0 ? versions.reduce((a, b) => (b.versionNumber ?? 0) > (a.versionNumber ?? 0) ? b : a) : null;
  const canExport = latestVersion != null;

  const bottomActions = (
    <>
      <Button variant="secondary" onClick={goToStep2}>
        <ArrowLeft className="h-4 w-4" />
        Back to Step 2
      </Button>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={handleSaveSettings} disabled={!latestVersion || savingSettings}>
          {savingSettings ? <><Spinner className="h-4 w-4" /> Saving…</> : 'Save Settings'}
        </Button>
        <Button onClick={handleExport} disabled={!canExport || exporting}>
          {exporting ? <><Spinner className="h-4 w-4" /> Exporting…</> : 'Export Excel File'}
        </Button>
        <Button variant="secondary" onClick={goToTemplates}>Finish</Button>
      </div>
    </>
  );

  if (loading) {
    return (
      <TemplateWizardLayout title="Export Excel Template" description="Step 3: Export your schema as an Excel file." bottomActions={bottomActions}>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </TemplateWizardLayout>
    );
  }

  if (error) {
    return (
      <TemplateWizardLayout title="Export Excel Template" bottomActions={bottomActions}>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Failed to load template.</p>
          <Button variant="secondary" onClick={loadTemplate}>Retry</Button>
        </div>
      </TemplateWizardLayout>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <TooltipProvider>
      <TemplateWizardLayout
        title="Export Excel Template"
        description="Step 3: Export your schema as an Excel file with optional settings."
        bottomActions={bottomActions}
      >
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">Export Studio</h2>
            <p className="text-sm text-muted-foreground">
              Configure options and export your template as Excel (.xlsx). Headers will be styled and the first row frozen.
            </p>
          </section>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-semibold text-neutral-900">{stats.tablesCount}</p>
                <p className="text-sm text-muted-foreground">Number of Tables</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-semibold text-neutral-900">{stats.fieldsCount}</p>
                <p className="text-sm text-muted-foreground">Number of Fields</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-semibold text-neutral-900">~{stats.estimatedKb} KB</p>
                <p className="text-sm text-muted-foreground">File Size (Estimated)</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-medium text-neutral-800">Export Options</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 cursor-pointer">
                  <input type="checkbox" checked={includeInstructionsSheet} onChange={(e) => setIncludeInstructionsSheet(e.target.checked)} />
                  <span className="text-sm">Include Instructions Sheet</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 cursor-pointer">
                  <input type="checkbox" checked={includeValidationRules} onChange={(e) => setIncludeValidationRules(e.target.checked)} />
                  <span className="text-sm">Include Data Validation Rules</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 cursor-pointer">
                  <input type="checkbox" checked={protectSheets} onChange={(e) => setProtectSheets(e.target.checked)} />
                  <span className="text-sm">Protect Sheets from Editing</span>
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 bg-neutral-50 opacity-75 cursor-not-allowed">
                      <input type="checkbox" disabled />
                      <span className="text-sm text-muted-foreground">Include Formulas</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 bg-neutral-50 opacity-75 cursor-not-allowed">
                      <input type="checkbox" disabled />
                      <span className="text-sm text-muted-foreground">Include Macros (VBA)</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 bg-neutral-50 opacity-75 cursor-not-allowed">
                      <input type="checkbox" disabled />
                      <span className="text-sm text-muted-foreground">Compress File to Reduce Size</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-medium text-neutral-800">Excel File Format</h3>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 bg-white cursor-pointer hover:bg-neutral-50">
                  <input type="radio" name="format" value="XLSX" defaultChecked readOnly />
                  <span className="text-sm">Excel Workbook (.xlsx)</span>
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 bg-neutral-50 opacity-75 cursor-not-allowed">
                      <input type="radio" name="format" value="XLS" disabled />
                      <span className="text-sm text-muted-foreground">Excel 97-2003 (.xls)</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 bg-neutral-50 opacity-75 cursor-not-allowed">
                      <input type="radio" name="format" value="XLSM" disabled />
                      <span className="text-sm text-muted-foreground">Excel Macro-Enabled (.xlsm)</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-medium text-neutral-800">Additional Settings</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">File name</label>
                  <Input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder={`${template.name ?? 'template'}_v${latestVersion?.versionNumber ?? 1}.xlsx`}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">.xlsx will be added if omitted.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">Template version</label>
                  <Input
                    type="text"
                    value={latestVersion != null ? `Version ${latestVersion.versionNumber}` : '—'}
                    readOnly
                    className="bg-neutral-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TemplateWizardLayout>
    </TooltipProvider>
  );
}
