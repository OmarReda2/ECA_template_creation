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
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { useToast } from '@/shared/ui/Toast';
import { normalizeHttpError, getErrorMessage } from '@/shared/errors/errorTypes';
import { UploadIdentifyStep } from '../components/UploadIdentifyStep';
import { IdentityResultCard } from '../components/IdentityResultCard';
import { ManualTemplateSelection } from '../components/ManualTemplateSelection';
import { ValidationSummaryCard } from '../components/ValidationSummaryCard';
import { ValidationIssueList } from '../components/ValidationIssueList';
import { SubmissionReviewCard } from '../components/SubmissionReviewCard';
import { submissionApi } from '../api';
import type { SubmissionIdentifyResponse, SubmissionValidationResponse } from '../types';
import { templatesApi } from '@/features/templates/api';
import type { TemplateSummary } from '@/features/templates/types';

const FALLBACK_STATES = new Set(['METADATA_MISSING', 'METADATA_INVALID', 'VERSION_NOT_FOUND']);

export default function SubmissionWizardPage() {
  const [uploadKey, setUploadKey] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [identifyResult, setIdentifyResult] = useState<SubmissionIdentifyResponse | null>(null);
  const [validationResult, setValidationResult] = useState<SubmissionValidationResponse | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [validating, setValidating] = useState(false);
  const { showErrorToast } = useToast();

  const shouldShowFallback = identifyResult != null && FALLBACK_STATES.has(identifyResult.status);
  const canValidate = identifyResult?.status === 'EXACT_MATCH' && uploadedFile != null;

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

  const stepValue = validationResult != null ? 'review' : canValidate ? 'validation' : 'upload';

  const handleIdentified = (file: File, result: SubmissionIdentifyResponse) => {
    setUploadedFile(file);
    setIdentifyResult(result);
    setValidationResult(null);
    setSelectedTemplateId('');
  };

  const handleValidate = async () => {
    if (uploadedFile == null || identifyResult?.status !== 'EXACT_MATCH') {
      return;
    }

    setValidating(true);
    try {
      const result = await submissionApi.validateWorkbook(uploadedFile);
      setValidationResult(result);
    } catch (error) {
      const normalized = normalizeHttpError(error);
      showErrorToast(getErrorMessage(normalized, true));
    } finally {
      setValidating(false);
    }
  };

  const handleRestart = () => {
    setUploadKey((current) => current + 1);
    setUploadedFile(null);
    setIdentifyResult(null);
    setValidationResult(null);
    setSelectedTemplateId('');
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Stepper value={stepValue}>
        <StepperList className="w-full">
          <StepperItem value="upload" completed={identifyResult != null} disabled={false}>
            <StepperTrigger disabled>
              <StepperIndicator />
              <StepperTitle>Upload &amp; Identify</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="validation" completed={validationResult != null} disabled={false}>
            <StepperTrigger disabled>
              <StepperIndicator />
              <StepperTitle>Validate &amp; Review Results</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="review" completed={false} disabled={false}>
            <StepperTrigger disabled>
              <StepperIndicator />
              <StepperTitle>Review / Restart</StepperTitle>
            </StepperTrigger>
          </StepperItem>
        </StepperList>
      </Stepper>

      <PageHeader
        title="Data Submission"
        description="Upload a workbook, confirm identity, then run backend validation to review workbook issues before any future submission slice."
      />

      <UploadIdentifyStep key={uploadKey} onIdentified={handleIdentified} />

      {identifyResult != null && <IdentityResultCard result={identifyResult} />}

      {identifyResult?.status === 'EXACT_MATCH' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Validate Workbook</CardTitle>
            <CardDescription>
              Validation is available because the workbook metadata matched a stored template version exactly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              The backend endpoint remains <code>/api/submissions/validate-structure</code>, but it now runs full workbook validation.
            </div>
            <Button type="button" onClick={handleValidate} disabled={!canValidate || validating}>
              {validating ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Validating...
                </>
              ) : (
                'Validate Workbook'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {identifyResult != null && identifyResult.status !== 'EXACT_MATCH' && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Not Available Yet</CardTitle>
            <CardDescription>
              Backend validation is gated by an exact identity match. Review the identification result and re-upload if needed.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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
            <CardDescription>
              This selection is manual fallback only and is not treated as auto-identification or validation eligibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {selectedTemplate.name} would use latest version v
            {selectedTemplate.latestVersion?.versionNumber ?? 'Not available'} in a later slice.
          </CardContent>
        </Card>
      )}

      {validationResult != null && (
        <div className="space-y-4">
          <ValidationSummaryCard result={validationResult} />
          <ValidationIssueList result={validationResult} />
        </div>
      )}

      <SubmissionReviewCard
        identifyResult={identifyResult}
        validationResult={validationResult}
        onRestart={handleRestart}
      />
    </div>
  );
}
