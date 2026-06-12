import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { ErrorPanel } from '@/shared/errors/ErrorPanel';
import { getErrorMessage, type FrontendError } from '@/shared/errors/errorTypes';
import type { SubmissionIdentifyResponse, SubmissionValidationResponse } from '../types';
import { ValidationIssueList } from './ValidationIssueList';
import { ValidationSummaryCard } from './ValidationSummaryCard';
import { Badge } from '@/shared/ui/Badge';
import { Skeleton } from '@/shared/ui/skeleton';
import type { TemplateSummary } from '@/features/templates/types';

interface SubmissionStepTwoViewProps {
  identifyResult: SubmissionIdentifyResponse | null;
  validationResult: SubmissionValidationResponse | null;
  validationError: FrontendError | null;
  validating: boolean;
  selectedTemplate: TemplateSummary | null;
  canValidate: boolean;
  canValidateWithManualFallback: boolean;
  onValidationErrorDismiss: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export function SubmissionStepTwoView({
  identifyResult,
  validationResult,
  validationError,
  validating,
  selectedTemplate,
  canValidate,
  canValidateWithManualFallback,
  onValidationErrorDismiss,
  onBack,
  onContinue,
}: SubmissionStepTwoViewProps) {
  return (
    <div className="space-y-6">
      {validationError != null && (
        <ErrorPanel error={getErrorMessage(validationError, true)} onDismiss={onValidationErrorDismiss} />
      )}

      {validating && validationResult == null ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Validation in progress</CardTitle>
                <CardDescription>
                  Step 2 is validating workbook structure and row content against the selected schema.
                </CardDescription>
              </div>
              <Badge variant="outline">Running</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Spinner className="h-4 w-4" />
              Validation is running. Results will appear here when the backend response returns.
            </div>
            <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : validationResult == null ? (
        <>
          {canValidate && identifyResult?.resolvedVersion != null && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Validate Workbook</CardTitle>
                <CardDescription>
                  Automatic validation is available because the workbook metadata matched a stored template version exactly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Validation will run against {identifyResult.resolvedVersion.templateName} v
                  {identifyResult.resolvedVersion.versionNumber}.
                  <span className="mt-1 block text-foreground">Validation starts automatically when Step 2 opens.</span>
                </div>
              </CardContent>
            </Card>
          )}

          {!canValidate && canValidateWithManualFallback && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Step 2: Manual Fallback Validation</CardTitle>
                    <CardDescription>
                      Automatic identification was not enough to continue, so validation will use the latest version of the selected template.
                    </CardDescription>
                  </div>
                  <Badge variant="warning">Manual fallback</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                  {selectedTemplate?.name ?? 'Selected template'} will validate against latest version v
                  {selectedTemplate?.latestVersion?.versionNumber ?? 'Not available'}.
                  <span className="mt-1 block">Validation starts automatically when Step 2 opens.</span>
                </div>
              </CardContent>
            </Card>
          )}

          {!canValidate && !canValidateWithManualFallback && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Validation Not Ready</CardTitle>
                    <CardDescription>
                      Complete Step 1 first. Validation requires either an exact metadata match or an explicit manual fallback template selection.
                    </CardDescription>
                  </div>
                  <Badge variant="warning">Blocked</Badge>
                </div>
              </CardHeader>
              <CardContent className="rounded-md border border-amber-200 bg-amber-50/70 text-sm text-amber-900">
                Validation is unavailable until this workbook resolves to a usable validation target.
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <ValidationSummaryCard result={validationResult} />
          <ValidationIssueList result={validationResult} />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={validating}>
          Back to Step 1
        </Button>
        <Button type="button" onClick={onContinue} disabled={validationResult == null || validating}>
          Continue to Review
        </Button>
      </div>
    </div>
  );
}
