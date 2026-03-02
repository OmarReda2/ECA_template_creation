import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templatesApi } from '../api';
import { exportVersion } from '@/features/export/api';
import type { TemplateDetail } from '../types';
import { TemplateWizardLayout } from '../components/TemplateWizardLayout';
import { ArrowLeft } from 'lucide-react';
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
      <TemplateWizardLayout
        title="Export Template"
        description="Step 3: Export artifacts."
        bottomActions={
          <>
            <Button variant="secondary" onClick={goToStep2}>
              <ArrowLeft className="h-4 w-4" />
              Back to Step 2
            </Button>
            <div />
          </>
        }
      >
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </TemplateWizardLayout>
    );
  }

  if (error) {
    return (
      <TemplateWizardLayout
        title="Export Template"
        description="Step 3: Export artifacts."
        bottomActions={
          <>
            <Button variant="secondary" onClick={goToStep2}>
              <ArrowLeft className="h-4 w-4" />
              Back to Step 2
            </Button>
            <Button variant="secondary" onClick={loadTemplate}>
              Retry
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Failed to load template.</p>
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
      bottomActions={
        <>
          <Button variant="secondary" onClick={goToStep2}>
            <ArrowLeft className="h-4 w-4" />
            Back to Step 2
          </Button>
          <div className="flex gap-2">
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
            <Button variant="secondary" onClick={goToTemplates}>
              Finish
            </Button>
          </div>
        </>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Template:</dt>
            <dd className="text-foreground">{template.name ?? '—'}</dd>

            <dt className="text-muted-foreground">Sector Code:</dt>
            <dd className="text-foreground">{template.sectorCode ?? '—'}</dd>

            {latestVersion != null && (
              <>
                <dt className="text-muted-foreground">Version:</dt>
                <dd className="text-foreground">{latestVersion.versionNumber}</dd>
              </>
            )}
          </dl>
          {canExport ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Export version {latestVersion?.versionNumber} as Excel (.xlsx).
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No versions available. Complete Step 2 to define the schema before exporting.
            </p>
          )}
        </CardContent>
      </Card>
    </TemplateWizardLayout>
  );
}
