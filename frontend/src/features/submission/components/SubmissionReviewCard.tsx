import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import type { SubmissionIdentifyResponse, SubmissionValidationResponse } from '../types';

interface SubmissionReviewCardProps {
  identifyResult: SubmissionIdentifyResponse | null;
  validationResult: SubmissionValidationResponse | null;
  onRestart: () => void;
}

export function SubmissionReviewCard({
  identifyResult,
  validationResult,
  onRestart,
}: SubmissionReviewCardProps) {
  const validationFinished = validationResult != null;
  const canValidate = identifyResult?.status === 'EXACT_MATCH';
  const submissionSaved = validationResult?.submissionId != null;
  const usedManualFallback = validationResult?.manualFallbackUsed === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review &amp; Restart</CardTitle>
        <CardDescription>
          This slice stops after validation results. You can review the outcome and restart with a new workbook.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`rounded-md border p-4 text-sm ${
            validationFinished
              ? submissionSaved
                ? 'border-green-200 bg-green-50 text-green-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-border bg-muted/40 text-muted-foreground'
          }`}
        >
          {validationFinished
            ? submissionSaved
              ? usedManualFallback
                ? 'Manual fallback validation finished and a submission record was saved. You can review the saved result or restart with a new workbook.'
                : 'Validation finished and a submission record was saved. You can review the saved result or restart with a new workbook.'
              : usedManualFallback
                ? 'Manual fallback validation finished for the current workbook. Review the returned issues, then restart or choose another template if needed.'
                : 'Validation finished for the current workbook. Review the returned issues, then restart with a corrected workbook if needed.'
            : canValidate
              ? 'Workbook identity is resolved. Run validation when you are ready, or restart with another workbook.'
              : 'Validation cannot continue until a workbook is uploaded and identified with EXACT_MATCH.'}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onRestart}>
            Re-upload Workbook
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
