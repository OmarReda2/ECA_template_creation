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
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
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

type WizardStep = 'upload' | 'validate' | 'review';
type PendingConfirmation =
  | { type: 'back-to-upload' }
  | { type: 'change-template'; nextTemplateId: string }
  | null;

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
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);
  const { showErrorToast } = useToast();

  const shouldShowFallback = identifyResult != null && FALLBACK_STATES.has(identifyResult.status);
  const canEnterValidate =
    (identifyResult?.status === 'EXACT_MATCH' && uploadedFile != null) ||
    (shouldShowFallback && uploadedFile != null && selectedTemplateId !== '');
  const canEnterReviewStep = validationResult != null;
  useEffect(() => {
    if (!shouldShowFallback || templates.length > 0) {
      return;
    }
    void templatesApi.list().then(setTemplates).catch(() => {
      setTemplates([]);
    });
  }, [shouldShowFallback, templates.length]);

  const clearValidationState = () => {
    setValidationResult(null);
    setValidationError(null);
  };

  const handleIdentifyStart = (file: File) => {
    setUploadedFile(file);
    setIdentifyResult(null);
    clearValidationState();
    setSelectedTemplateId('');
    setIdentifyError(null);
    setActiveStep('upload');
  };

  const handleIdentified = (file: File, result: SubmissionIdentifyResponse) => {
    setUploadedFile(file);
    setIdentifyResult(result);
    setValidationResult(null);
    setSelectedTemplateId('');
    setIdentifyError(null);
    setValidationError(null);
    setActiveStep('upload');
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
      setActiveStep('validate');
    } catch (error) {
      const normalized = normalizeHttpError(error);
      setValidationError(normalized);
      showErrorToast(getErrorMessage(normalized, true));
    } finally {
      setValidating(false);
    }
  };

  const handleManualFallbackValidate = async () => {
    if (uploadedFile == null || !canEnterValidate || !shouldShowFallback || selectedTemplateId === '') {
      return;
    }

    setValidating(true);
    setValidationError(null);
    try {
      const result = await submissionApi.validateWorkbook(uploadedFile, { templateId: selectedTemplateId });
      setValidationResult(result);
      setActiveStep('validate');
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

  const handleSelectTemplate = (templateId: string) => {
    if (selectedTemplateId === templateId) {
      return;
    }
    if (validationResult != null) {
      setPendingConfirmation({ type: 'change-template', nextTemplateId: templateId });
      return;
    }
    setSelectedTemplateId(templateId);
    setActiveStep('upload');
  };

  const navigateToStep = (step: WizardStep) => {
    if (step === activeStep) {
      return;
    }
    if (validating && step !== 'validate') {
      return;
    }
    if (step === 'validate' && !canEnterValidate) {
      return;
    }
    if (step === 'review' && !canEnterReviewStep) {
      return;
    }
    if (step === 'upload' && validationResult != null) {
      setPendingConfirmation({ type: 'back-to-upload' });
      return;
    }
    setActiveStep(step);
  };

  const confirmPendingNavigation = () => {
    if (pendingConfirmation == null) {
      return;
    }

    clearValidationState();

    if (pendingConfirmation.type === 'change-template') {
      setSelectedTemplateId(pendingConfirmation.nextTemplateId);
      setActiveStep('upload');
    } else {
      setActiveStep('upload');
    }

    setPendingConfirmation(null);
  };

  const stepViewClassName =
    'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-1 motion-safe:duration-200';

  const uploadCompleted = activeStep !== 'upload' && canEnterValidate;
  const validateCompleted = activeStep === 'review' && validationResult != null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Stepper value={activeStep}>
        <StepperList className="w-full">
          <StepperItem value="upload" completed={uploadCompleted} disabled={validating}>
            <StepperTrigger onClick={() => navigateToStep('upload')}>
              <StepperIndicator />
              <StepperTitle>Upload &amp; Identify</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="validate" completed={validateCompleted} disabled={!canEnterValidate}>
            <StepperTrigger onClick={() => navigateToStep('validate')}>
              <StepperIndicator />
              <StepperTitle>Validate &amp; Review Results</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="review" completed={false} disabled={!canEnterReviewStep || validating}>
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
        <div className={stepViewClassName}>
          <SubmissionStepOneView
            uploadKey={uploadKey}
            identifyResult={identifyResult}
            identifyError={identifyError}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            shouldShowFallback={shouldShowFallback}
            canContinue={canEnterValidate}
            onIdentifyStart={handleIdentifyStart}
            onIdentified={handleIdentified}
            onIdentifyError={setIdentifyError}
            onSelectTemplate={handleSelectTemplate}
            onContinue={() => navigateToStep('validate')}
          />
        </div>
      )}

      {activeStep === 'validate' && (
        <div className={stepViewClassName}>
          <SubmissionStepTwoView
            identifyResult={identifyResult}
            validationResult={validationResult}
            validationError={validationError}
            validating={validating}
            selectedTemplateId={selectedTemplateId}
            templates={templates}
            canValidate={identifyResult?.status === 'EXACT_MATCH' && uploadedFile != null}
            canValidateWithManualFallback={shouldShowFallback && uploadedFile != null && selectedTemplateId !== ''}
            onValidate={handleValidate}
            onManualFallbackValidate={handleManualFallbackValidate}
            onValidationErrorDismiss={() => setValidationError(null)}
            onBack={() => navigateToStep('upload')}
            onContinue={() => navigateToStep('review')}
          />
        </div>
      )}

      {activeStep === 'review' && (
        <div className={stepViewClassName}>
          <SubmissionStepThreeView
            identifyResult={identifyResult}
            validationResult={validationResult}
            onBack={() => navigateToStep('validate')}
            onRestart={handleRestart}
          />
        </div>
      )}

      {activeStep === 'validate' && !canEnterValidate && (
        <div className="text-sm text-muted-foreground">
          Validation is not available until Step 1 resolves an exact match or a manual fallback selection is ready.
        </div>
      )}

      <Modal
        open={pendingConfirmation != null}
        onClose={() => setPendingConfirmation(null)}
        title="Clear current validation results?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {pendingConfirmation?.type === 'change-template'
              ? 'Changing the manual fallback template will clear the current validation results before continuing.'
              : 'Going back to Step 1 will clear the current validation results before continuing.'}
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setPendingConfirmation(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmPendingNavigation}>
              Clear and continue
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
