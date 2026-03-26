import { useEffect, useState } from 'react';
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
import { useToast } from '@/shared/ui/Toast';
import { normalizeHttpError, getErrorMessage, type FrontendError } from '@/shared/errors/errorTypes';
import { submissionApi } from '../api';
import type { SubmissionIdentifyResponse, SubmissionValidationResponse } from '../types';
import { templatesApi } from '@/features/templates/api';
import type { TemplateSummary } from '@/features/templates/types';
import { SubmissionStepOneView } from '../components/SubmissionStepOneView';
import { SubmissionStepTwoView } from '../components/SubmissionStepTwoView';
import { SubmissionStepThreeView } from '../components/SubmissionStepThreeView';

const FALLBACK_STATES = new Set(['METADATA_MISSING', 'METADATA_INVALID', 'VERSION_NOT_FOUND']);

type WizardStep = 'upload' | 'validation' | 'review';

export default function SubmissionWizardPage() {
  const [activeStep, setActiveStep] = useState<WizardStep>('upload');
  const [uploadKey, setUploadKey] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [identifyResult, setIdentifyResult] = useState<SubmissionIdentifyResponse | null>(null);
  const [validationResult, setValidationResult] = useState<SubmissionValidationResponse | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [validating, setValidating] = useState(false);
  const [identifyError, setIdentifyError] = useState<FrontendError | null>(null);
  const [validationError, setValidationError] = useState<FrontendError | null>(null);
  const { showErrorToast } = useToast();

  const shouldShowFallback = identifyResult != null && FALLBACK_STATES.has(identifyResult.status);
  const canValidate = identifyResult?.status === 'EXACT_MATCH' && uploadedFile != null;
  const canValidateWithManualFallback = shouldShowFallback && uploadedFile != null && selectedTemplateId !== '';
  const canEnterValidationStep = canValidate || canValidateWithManualFallback || validationResult != null;
  const canEnterReviewStep = validationResult != null;

  useEffect(() => {
    if (!shouldShowFallback || templates.length > 0) {
      return;
    }
    void templatesApi.list().then(setTemplates).catch(() => {
      setTemplates([]);
    });
  }, [shouldShowFallback, templates.length]);

  const handleIdentified = (file: File, result: SubmissionIdentifyResponse) => {
    setUploadedFile(file);
    setIdentifyResult(result);
    setValidationResult(null);
    setSelectedTemplateId('');
    setIdentifyError(null);
    setValidationError(null);
    if (result.status === 'EXACT_MATCH' || FALLBACK_STATES.has(result.status)) {
      setActiveStep('validation');
    } else {
      setActiveStep('upload');
    }
  };

  const handleValidate = async () => {
    if (uploadedFile == null || identifyResult?.status !== 'EXACT_MATCH') {
      return;
    }

    setValidating(true);
    setValidationError(null);
    try {
      const result = await submissionApi.validateWorkbook(uploadedFile);
      setValidationResult(result);
      setActiveStep('review');
    } catch (error) {
      const normalized = normalizeHttpError(error);
      setValidationError(normalized);
      showErrorToast(getErrorMessage(normalized, true));
    } finally {
      setValidating(false);
    }
  };

  const handleManualFallbackValidate = async () => {
    if (uploadedFile == null || !canValidateWithManualFallback) {
      return;
    }

    setValidating(true);
    setValidationError(null);
    try {
      const result = await submissionApi.validateWorkbook(uploadedFile, { templateId: selectedTemplateId });
      setValidationResult(result);
      setActiveStep('review');
    } catch (error) {
      const normalized = normalizeHttpError(error);
      setValidationError(normalized);
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
    setIdentifyError(null);
    setValidationError(null);
    setActiveStep('upload');
  };

  const clearValidationState = () => {
    setValidationResult(null);
    setValidationError(null);
  };

  const handleSelectTemplate = (templateId: string) => {
    if (selectedTemplateId === templateId) {
      return;
    }
    if (validationResult != null) {
      const confirmed = window.confirm(
        'Changing the manual fallback template will clear the current validation results. Continue?'
      );
      if (!confirmed) {
        return;
      }
      clearValidationState();
      setActiveStep('upload');
    }
    setSelectedTemplateId(templateId);
  };

  const navigateToStep = (step: WizardStep) => {
    if (step === activeStep) {
      return;
    }
    if (step === 'validation' && !canEnterValidationStep) {
      return;
    }
    if (step === 'review' && !canEnterReviewStep) {
      return;
    }
    if (step === 'upload' && validationResult != null) {
      const confirmed = window.confirm(
        'Going back to Step 1 will clear the current validation results. Continue?'
      );
      if (!confirmed) {
        return;
      }
      clearValidationState();
    }
    setActiveStep(step);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Stepper value={activeStep}>
        <StepperList className="w-full">
          <StepperItem value="upload" completed={identifyResult != null} disabled={false}>
            <StepperTrigger onClick={() => navigateToStep('upload')}>
              <StepperIndicator />
              <StepperTitle>Upload &amp; Identify</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="validation" completed={validationResult != null} disabled={!canEnterValidationStep}>
            <StepperTrigger onClick={() => navigateToStep('validation')}>
              <StepperIndicator />
              <StepperTitle>Validate &amp; Review Results</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="review" completed={false} disabled={!canEnterReviewStep}>
            <StepperTrigger onClick={() => navigateToStep('review')}>
              <StepperIndicator />
              <StepperTitle>Review / Restart</StepperTitle>
            </StepperTrigger>
          </StepperItem>
        </StepperList>
      </Stepper>

      <PageHeader
        title="Data Submission"
        description="Upload a workbook, confirm identity, then move through validation and review as separate steps."
      />

      {activeStep === 'upload' && (
        <SubmissionStepOneView
          uploadKey={uploadKey}
          identifyResult={identifyResult}
          identifyError={identifyError}
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          shouldShowFallback={shouldShowFallback}
          onIdentified={handleIdentified}
          onIdentifyError={setIdentifyError}
          onSelectTemplate={handleSelectTemplate}
        />
      )}

      {activeStep === 'validation' && (
        <SubmissionStepTwoView
          identifyResult={identifyResult}
          validationResult={validationResult}
          validationError={validationError}
          validating={validating}
          selectedTemplateId={selectedTemplateId}
          templates={templates}
          canValidate={canValidate}
          canValidateWithManualFallback={canValidateWithManualFallback}
          onValidate={handleValidate}
          onManualFallbackValidate={handleManualFallbackValidate}
          onValidationErrorDismiss={() => setValidationError(null)}
          onBack={() => navigateToStep('upload')}
          onContinue={() => navigateToStep('review')}
        />
      )}

      {activeStep === 'review' && (
        <SubmissionStepThreeView
          identifyResult={identifyResult}
          validationResult={validationResult}
          onBack={() => navigateToStep('validation')}
          onRestart={handleRestart}
        />
      )}

      {activeStep === 'validation' && !canEnterValidationStep && (
        <div className="text-sm text-muted-foreground">
          Validation is not available until Step 1 resolves an exact match or a manual fallback selection is ready.
        </div>
      )}
    </div>
  );
}
