import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templatesApi } from '../api';
import { exportVersion } from '@/features/export/api';
import type { TemplateDetail } from '../types';
import { TemplateWizardLayout } from '../components/TemplateWizardLayout';
import { ActionLink, IconArrowLeft } from '@/shared/ui/ActionButtons';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { useToast } from '@/shared/ui/Toast';
import { downloadBlobWithDisposition } from '@/shared/lib/download';
import {
  normalizeHttpError,
  getErrorMessage,
  type FrontendError,
} from '@/shared/errors/errorTypes';

export default function CreateTemplateExportPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { showToast, showErrorToast } = useToast();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FrontendError | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await templatesApi.getById(templateId);
      setTemplate(data);
    } catch (e) {
      const err = normalizeHttpError(e);
      setError(err);
      setTemplate(null);
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

  const handleExport = useCallback(async () => {
    if (!template) return;
    const versions = template.versions ?? [];
    if (versions.length === 0) return;
    const latest = versions.reduce((a, b) =>
      (b.versionNumber ?? 0) > (a.versionNumber ?? 0) ? b : a
    );
    setExporting(true);
    try {
      const { blob, contentDisposition } = await exportVersion(latest.id);
      const fallback = `${template.name ?? 'template'}_v${latest.versionNumber}.xlsx`;
      downloadBlobWithDisposition(blob, contentDisposition, fallback);
      showToast('Export downloaded.', 'success');
    } catch (e) {
      const err = normalizeHttpError(e);
      showErrorToast(getErrorMessage(err, true), {
        status: err.status,
        details: getErrorMessage(err, true),
      });
    } finally {
      setExporting(false);
    }
  }, [template, showToast, showErrorToast]);

  if (!templateId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <TemplateWizardLayout
        title="Export Template"
        description="Step 3: Export artifacts."
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Failed to load template.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadTemplate}>Retry</Button>
            <Button variant="secondary" onClick={goToStep2}>Back to Step 2</Button>
          </div>
        </div>
      </TemplateWizardLayout>
    );
  }

  if (!template) {
    return null;
  }

  const versions = template.versions ?? [];
  const latestVersion = versions.length > 0
    ? versions.reduce((a, b) => (b.versionNumber ?? 0) > (a.versionNumber ?? 0) ? b : a)
    : null;
  const canExport = latestVersion != null;

  return (
    <TemplateWizardLayout
      title="Export Template"
      description="Step 3: Export artifacts."
      rightActions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={goToTemplates}>
            Finish
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport || exporting}
          >
            {exporting ? (
              <>
                <Spinner className="h-4 w-4" />
                Exporting…
              </>
            ) : (
              'Export'
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <ActionLink to={`/templates/create/${templateId}`}>
          <IconArrowLeft />
          Back to Step 2
        </ActionLink>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-700">Template</p>
              <p className="text-sm text-neutral-600">{template.name}</p>
              <Badge variant="neutral" className="mt-1">{template.sectorCode}</Badge>
            </div>
            {canExport ? (
              <p className="text-sm text-muted-foreground">
                Export version {latestVersion.versionNumber} as Excel (.xlsx).
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No versions available. Complete Step 2 to define the schema before exporting.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </TemplateWizardLayout>
  );
}
