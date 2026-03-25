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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review &amp; Restart</CardTitle>
        <CardDescription>
          This slice stops after validation results. You can review the outcome and restart with a new workbook.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          {validationFinished
            ? 'Validation finished for the current workbook. No submission persistence or final submit action exists in this slice.'
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
