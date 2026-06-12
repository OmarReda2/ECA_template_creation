import { Button } from '@/shared/ui/Button';
import type { SubmissionIdentifyResponse, SubmissionValidationResponse } from '../types';
import { SubmissionReviewCard } from './SubmissionReviewCard';

interface SubmissionStepThreeViewProps {
  identifyResult: SubmissionIdentifyResponse | null;
  validationResult: SubmissionValidationResponse | null;
  onBack: () => void;
  onRestart: () => void;
}

export function SubmissionStepThreeView({
  identifyResult,
  validationResult,
  onBack,
  onRestart,
}: SubmissionStepThreeViewProps) {
  return (
    <div className="space-y-6">
      <SubmissionReviewCard
        identifyResult={identifyResult}
        validationResult={validationResult}
        onRestart={onRestart}
      />

      <div className="flex justify-start">
        <Button type="button" variant="outline" onClick={onBack}>
          Back to Validation Results
        </Button>
      </div>
    </div>
  );
}
