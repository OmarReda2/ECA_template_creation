import { useEffect, useMemo, useState } from 'react';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/shared/ui/stepper';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { UploadIdentifyStep } from '../components/UploadIdentifyStep';
import { IdentityResultCard } from '../components/IdentityResultCard';
import { ManualTemplateSelection } from '../components/ManualTemplateSelection';
import type { SubmissionIdentifyResponse } from '../types';
import { templatesApi } from '@/features/templates/api';
import type { TemplateSummary } from '@/features/templates/types';

const FALLBACK_STATES = new Set(['METADATA_MISSING', 'METADATA_INVALID', 'VERSION_NOT_FOUND']);

export default function SubmissionWizardPage() {
  const [result, setResult] = useState<SubmissionIdentifyResponse | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const shouldShowFallback = result != null && FALLBACK_STATES.has(result.status);

  useEffect(() => {
    if (!shouldShowFallback || templates.length > 0) {
      return;
    }
    void templatesApi.list().then(setTemplates).catch(() => {
      setTemplates([]);
    });
  }, [shouldShowFallback, templates.length]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.templateId === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Stepper value="upload">
        <StepperList className="w-full">
          <StepperItem value="upload" completed={false} disabled={false}>
            <StepperTrigger disabled>
              <StepperIndicator />
              <StepperTitle>Upload &amp; Identify Template</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="validation" completed={false} disabled>
            <StepperTrigger disabled>
              <StepperIndicator />
              <StepperTitle>Validation &amp; Review</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="review" completed={false} disabled>
            <StepperTrigger disabled>
              <StepperIndicator />
              <StepperTitle>Review</StepperTitle>
            </StepperTrigger>
          </StepperItem>
        </StepperList>
      </Stepper>

      <PageHeader
        title="Data Submission"
        description="Step 1 is active in this slice. Upload a workbook to identify the template version from its metadata."
      />

      <UploadIdentifyStep onResult={setResult} />

      {result != null && <IdentityResultCard result={result} />}

      {shouldShowFallback && (
        <ManualTemplateSelection
          templates={templates}
          value={selectedTemplateId}
          onChange={setSelectedTemplateId}
        />
      )}

      {selectedTemplate != null && (
        <Card>
          <CardHeader>
            <CardTitle>Fallback selection summary</CardTitle>
            <CardDescription>This selection is manual fallback only and is not treated as auto-identification.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {selectedTemplate.name} would use latest version v
            {selectedTemplate.latestVersion?.versionNumber ?? 'Not available'} in a later slice.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="opacity-80">
          <CardHeader>
            <CardTitle>Step 2 Placeholder</CardTitle>
            <CardDescription>Validation &amp; review is intentionally not implemented in this slice.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="opacity-80">
          <CardHeader>
            <CardTitle>Step 3 Placeholder</CardTitle>
            <CardDescription>Final review remains a placeholder until later submission slices.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
