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

type WizardStep = 'upload' | 'validate' | 'review';
type PendingConfirmation =
  | { type: 'clear-validation-and-return-upload' }
  | { type: 'change-fallback-template'; nextTemplateId: string }
  | null;

interface WizardStepConfig {
  key: WizardStep;
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
  };

  const resetWizard = () => {
    setUploadKey((current) => current + 1);
    setSelectedFile(null);
    setIdentifyResult(null);
    setSelectedFallbackTemplateId('');
    setIdentifyError(null);
    setIsIdentifying(false);
    setIsValidating(false);
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
    clearValidationState();
  };

  const handleIdentified = (file: File, result: SubmissionIdentifyResponse) => {
    setSelectedFile(file);
    setIdentifyResult(result);
    setSelectedFallbackTemplateId('');
    setIdentifyError(null);
    setIsIdentifying(false);
    setPendingConfirmation(null);
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
      const result = await submissionApi.validateWorkbook(selectedFile);
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
      const result = await submissionApi.validateWorkbook(selectedFile, {
        templateId: selectedFallbackTemplateId,
      });
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
        title: 'Upload & Identify',
        completed: activeStep !== 'upload' && canEnterValidate,
        disabled: isValidating,
      },
      {
        key: 'validate',
        title: 'Validate & Review Results',
        completed: activeStep === 'review' && validationResult != null,
        disabled: !canEnterValidate,
      },
      {
        key: 'review',
        title: 'Review / Restart',
        completed: false,
        disabled: !canEnterReview || isValidating,
      },
    ],
    [activeStep, canEnterReview, canEnterValidate, isValidating, validationResult]
  );

  const stepViewClassName =
    'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-1 motion-safe:duration-200';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Stepper value={activeStep}>
        <StepperList className="w-full">
          {stepConfigs.map((step, index) => (
            <StepperItem key={step.key} value={step.key} completed={step.completed} disabled={step.disabled}>
              <StepperTrigger onClick={() => requestStepNavigation(step.key)}>
                <StepperIndicator />
                <StepperTitle>{step.title}</StepperTitle>
              </StepperTrigger>
              {index < stepConfigs.length - 1 && <StepperSeparator />}
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
            onValidate={handleValidateAutomatic}
            onManualFallbackValidate={handleValidateManualFallback}
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
