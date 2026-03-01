import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templatesApi } from '../api';
import type { TemplateDetail } from '../types';
import { TemplateWizardLayout } from '../components/TemplateWizardLayout';
import { SchemaEditorView } from '@/features/schema/components/SchemaEditorView';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { useToast } from '@/shared/ui/Toast';
import {
  normalizeHttpError,
  getErrorMessage,
  type FrontendError,
} from '@/shared/errors/errorTypes';

export default function CreateTemplateStepPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { showErrorToast } = useToast();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FrontendError | null>(null);

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

  const goToStep1 = () => navigate('/templates/create');

  if (!templateId) {
    return null;
  }

  if (loading) {
    return (
      <TemplateWizardLayout
        title="Edit Schema"
        description="Step 2: Define tables and fields."
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
        title="Edit Schema"
        description="Step 2: Define tables and fields."
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Failed to load template.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadTemplate}>Retry</Button>
            <Button variant="secondary" onClick={goToStep1}>Back to step 1</Button>
          </div>
        </div>
      </TemplateWizardLayout>
    );
  }

  if (!template) {
    return null;
  }

  const versions = template.versions ?? [];
  if (versions.length === 0) {
    return (
      <TemplateWizardLayout
        title="Edit Schema"
        description="Step 2: Define tables and fields."
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Template has no versions.</p>
          <Button variant="secondary" onClick={goToStep1}>Back to step 1</Button>
        </div>
      </TemplateWizardLayout>
    );
  }

  const latestVersion = versions.reduce((a, b) =>
    (b.versionNumber ?? 0) > (a.versionNumber ?? 0) ? b : a
  );
  const versionId = latestVersion.id;

  return (
    <TemplateWizardLayout
      title="Edit Schema"
      description="Step 2: Define tables and fields."
    >
      <SchemaEditorView
      templateId={templateId}
      versionId={versionId}
        backPath="/templates/create"
        backLabel="Back to step 1"
        saveSuccessPath={`/templates/create/${templateId}/export`}
      />
    </TemplateWizardLayout>
  );
}
