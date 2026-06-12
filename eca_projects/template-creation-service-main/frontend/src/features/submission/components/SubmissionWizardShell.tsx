import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/shared/ui/stepper';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useToast } from '@/shared/ui/Toast';
import { normalizeHttpError, getErrorMessage, type FrontendError } from '@/shared/errors/errorTypes';
import { templatesApi } from '@/features/templates/api';
import type { TemplateSummary } from '@/features/templates/types';
import { submissionApi } from '../api';
import type { SubmissionIdentifyResponse, SubmissionValidationResponse } from '../types';
import { SubmissionStepOneView } from './SubmissionStepOneView';
import { SubmissionStepTwoView } from './SubmissionStepTwoView';
import { SubmissionStepThreeView } from './SubmissionStepThreeView';

const FALLBACK_STATES = new Set(['METADATA_MISSING', 'METADATA_INVALID', 'VERSION_NOT_FOUND']);
const VALIDATION_MIN_LOADING_MS = 800;

type WizardStep = 'upload' | 'validate' | 'review';
type PendingConfirmation =
  | { type: 'clear-validation-and-return-upload' }
  | { type: 'change-fallback-template'; nextTemplateId: string }
  | null;

interface WizardStepConfig {
  key: WizardStep;
  stepNumber: 1 | 2 | 3;
  title: string;
  completed: boolean;
  disabled: boolean;
}

export function SubmissionWizardShell() {
  const [activeStep, setActiveStep] = useState<WizardStep>('upload');
  const [uploadKey, setUploadKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [identifyResult, setIdentifyResult] = useState<SubmissionIdentifyResponse | null>(null);
  const [selectedFallbackTemplateId, setSelectedFallbackTemplateId] = useState('');
  const [validationResult, setValidationResult] = useState<SubmissionValidationResponse | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationEntryToken, setValidationEntryToken] = useState(0);
  const [lastAutoValidatedEntryToken, setLastAutoValidatedEntryToken] = useState<number | null>(null);
  const [identifyError, setIdentifyError] = useState<FrontendError | null>(null);
  const [validationError, setValidationError] = useState<FrontendError | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);
  const { showErrorToast } = useToast();

  const shouldShowFallback = identifyResult != null && FALLBACK_STATES.has(identifyResult.status);
  const selectedFallbackTemplateSummary =
    templates.find((template) => template.templateId === selectedFallbackTemplateId) ?? null;
  const canEnterValidate =
    (identifyResult?.status === 'EXACT_MATCH' && selectedFile != null) ||
    (shouldShowFallback && selectedFile != null && selectedFallbackTemplateSummary != null);
  const canEnterReview = validationResult != null;

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
    setLastAutoValidatedEntryToken(null);
  };

  const resetWizard = () => {
    setUploadKey((current) => current + 1);
    setSelectedFile(null);
    setIdentifyResult(null);
    setSelectedFallbackTemplateId('');
    setIdentifyError(null);
    setIsIdentifying(false);
    setIsValidating(false);
    setValidationEntryToken(0);
    setLastAutoValidatedEntryToken(null);
    clearValidationState();
    setActiveStep('upload');
  };

  const handleIdentifyStart = (file: File) => {
    setSelectedFile(file);
    setIdentifyResult(null);
    setSelectedFallbackTemplateId('');
    setIdentifyError(null);
    setPendingConfirmation(null);
    setIsIdentifying(true);
    setActiveStep('upload');
    setValidationEntryToken(0);
    setLastAutoValidatedEntryToken(null);
    clearValidationState();
  };

  const handleIdentified = (file: File, result: SubmissionIdentifyResponse) => {
    setSelectedFile(file);
    setIdentifyResult(result);
    setSelectedFallbackTemplateId('');
    setIdentifyError(null);
    setIsIdentifying(false);
    setPendingConfirmation(null);
    setValidationEntryToken(0);
    setLastAutoValidatedEntryToken(null);
    clearValidationState();
    setActiveStep('upload');
  };

  const handleIdentifyError = (error: FrontendError | null) => {
    setIdentifyError(error);
    setIsIdentifying(false);
  };

  const handleSelectFallbackTemplate = (templateId: string) => {
    if (selectedFallbackTemplateId === templateId) {
      return;
    }

    if (validationResult != null) {
      setPendingConfirmation({ type: 'change-fallback-template', nextTemplateId: templateId });
      return;
    }

    setSelectedFallbackTemplateId(templateId);
    setActiveStep('upload');
  };

  const handleValidateAutomatic = async () => {
    if (selectedFile == null || identifyResult?.status !== 'EXACT_MATCH') {
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const [result] = await Promise.all([
        submissionApi.validateWorkbook(selectedFile),
        new Promise((resolve) => setTimeout(resolve, VALIDATION_MIN_LOADING_MS)),
      ]);
      setValidationResult(result);
      setActiveStep('validate');
    } catch (error) {
      const normalized = normalizeHttpError(error);
      setValidationError(normalized);
      showErrorToast(getErrorMessage(normalized, true));
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateManualFallback = async () => {
    if (
      selectedFile == null ||
      selectedFallbackTemplateId === '' ||
      selectedFallbackTemplateSummary == null ||
      !shouldShowFallback
    ) {
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const [result] = await Promise.all([
        submissionApi.validateWorkbook(selectedFile, {
          templateId: selectedFallbackTemplateId,
        }),
        new Promise((resolve) => setTimeout(resolve, VALIDATION_MIN_LOADING_MS)),
      ]);
      setValidationResult(result);
      setActiveStep('validate');
    } catch (error) {
      const normalized = normalizeHttpError(error);
      setValidationError(normalized);
      showErrorToast(getErrorMessage(normalized, true));
    } finally {
      setIsValidating(false);
    }
  };

  const requestStepNavigation = (nextStep: WizardStep) => {
    if (nextStep === activeStep) {
      return;
    }

    if (isValidating && nextStep !== 'validate') {
      return;
    }

    if (nextStep === 'validate' && !canEnterValidate) {
      return;
    }

    if (nextStep === 'review' && !canEnterReview) {
      return;
    }

    if (nextStep === 'upload' && validationResult != null) {
      setPendingConfirmation({ type: 'clear-validation-and-return-upload' });
      return;
    }

    if (nextStep === 'validate') {
      setValidationEntryToken((current) => current + 1);
    }

    setActiveStep(nextStep);
  };

  const confirmPendingNavigation = () => {
    if (pendingConfirmation == null) {
      return;
    }

    clearValidationState();

    if (pendingConfirmation.type === 'change-fallback-template') {
      setSelectedFallbackTemplateId(pendingConfirmation.nextTemplateId);
    }

    setActiveStep('upload');
    setPendingConfirmation(null);
  };

  const stepConfigs = useMemo<WizardStepConfig[]>(
    () => [
      {
        key: 'upload',
        stepNumber: 1,
        title: 'Upload & Identify',
        completed: activeStep !== 'upload',
        disabled: false,
      },
      {
        key: 'validate',
        stepNumber: 2,
        title: 'Validate & Review Results',
        completed: activeStep === 'review' && validationResult != null,
        disabled: !canEnterValidate,
      },
      {
        key: 'review',
        stepNumber: 3,
        title: 'Review / Restart',
        completed: false,
        disabled: !canEnterReview || isValidating,
      },
    ],
    [activeStep, canEnterReview, canEnterValidate, isValidating, validationResult]
  );

  const stepViewClassName =
    'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-1 motion-safe:duration-200';

  useEffect(() => {
    if (
      activeStep !== 'validate' ||
      !canEnterValidate ||
      validationResult != null ||
      isValidating ||
      validationEntryToken === 0 ||
      lastAutoValidatedEntryToken === validationEntryToken
    ) {
      return;
    }

    setLastAutoValidatedEntryToken(validationEntryToken);

    if (identifyResult?.status === 'EXACT_MATCH') {
      void handleValidateAutomatic();
      return;
    }

    if (shouldShowFallback && selectedFallbackTemplateSummary != null) {
      void handleValidateManualFallback();
    }
  }, [
    activeStep,
    canEnterValidate,
    handleValidateAutomatic,
    handleValidateManualFallback,
    identifyResult?.status,
    isValidating,
    lastAutoValidatedEntryToken,
    selectedFallbackTemplateSummary,
    shouldShowFallback,
    validationEntryToken,
    validationResult,
  ]);

  const getIndicatorContent = (step: WizardStepConfig) => {
    if (activeStep === step.key) {
      return step.stepNumber;
    }

    if (step.completed) {
      return <Check className="size-4" />;
    }

    return step.stepNumber;
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Stepper value={activeStep}>
        <StepperList className="w-full">
          {stepConfigs.map((step, index) => (
            <StepperItem key={step.key} value={step.key} completed={step.completed} disabled={step.disabled}>
              <StepperTrigger onClick={() => requestStepNavigation(step.key)}>
                <StepperIndicator>{getIndicatorContent(step)}</StepperIndicator>
                <StepperTitle>{step.title}</StepperTitle>
              </StepperTrigger>
              {index < stepConfigs.length - 1 && (
                <StepperSeparator className={step.completed ? '!bg-primary' : '!bg-border/80'} />
              )}
            </StepperItem>
          ))}
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
            selectedTemplateId={selectedFallbackTemplateId}
            selectedTemplateSummary={selectedFallbackTemplateSummary}
            shouldShowFallback={shouldShowFallback}
            identifying={isIdentifying}
            canContinue={canEnterValidate}
            onIdentifyStart={handleIdentifyStart}
            onIdentified={handleIdentified}
            onIdentifyError={handleIdentifyError}
            onSelectTemplate={handleSelectFallbackTemplate}
            onContinue={() => requestStepNavigation('validate')}
          />
        </div>
      )}

      {activeStep === 'validate' && (
        <div className={stepViewClassName}>
          <SubmissionStepTwoView
            identifyResult={identifyResult}
            validationResult={validationResult}
            validationError={validationError}
            validating={isValidating}
            selectedTemplate={selectedFallbackTemplateSummary}
            canValidate={identifyResult?.status === 'EXACT_MATCH' && selectedFile != null}
            canValidateWithManualFallback={shouldShowFallback && selectedFile != null && selectedFallbackTemplateSummary != null}
            onValidationErrorDismiss={() => setValidationError(null)}
            onBack={() => requestStepNavigation('upload')}
            onContinue={() => requestStepNavigation('review')}
          />
        </div>
      )}

      {activeStep === 'review' && (
        <div className={stepViewClassName}>
          <SubmissionStepThreeView
            identifyResult={identifyResult}
            validationResult={validationResult}
            onBack={() => requestStepNavigation('validate')}
            onRestart={resetWizard}
          />
        </div>
      )}

      <Modal
        open={pendingConfirmation != null}
        onClose={() => setPendingConfirmation(null)}
        title="Clear current validation results?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {pendingConfirmation?.type === 'change-fallback-template'
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
