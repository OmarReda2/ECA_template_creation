import { Badge } from '@/shared/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import type { SubmissionValidationResponse } from '../types';

function formatValue(value: string | number | null | undefined) {
  return value == null || value === '' ? 'Not available' : String(value);
}

interface ValidationSummaryCardProps {
  result: SubmissionValidationResponse;
}

export function ValidationSummaryCard({ result }: ValidationSummaryCardProps) {
  const errors = result.errors ?? [];
  const warnings = result.warnings ?? [];
  const errorCount = errors.length;
  const warningCount = warnings.length;
  const hasIssues = errorCount > 0 || warningCount > 0;
  const submissionSaved = result.submissionId != null;
  const targetSourceLabel =
    result.validationTargetSource === 'MANUAL_FALLBACK' ? 'Manual fallback' : 'Auto-identified';

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Validation Summary</CardTitle>
            <CardDescription>
              Backend validation checked workbook structure and row/cell content against the resolved schema.
            </CardDescription>
          </div>
          <Badge variant={errorCount > 0 ? 'destructive' : warningCount > 0 ? 'warning' : 'success'}>
            {hasIssues ? `${errorCount} errors / ${warningCount} warnings` : 'No issues found'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2 rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Validation target</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Template</dt>
              <dd className="text-right">{formatValue(result.targetVersion?.templateName)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Version</dt>
              <dd className="text-right">{formatValue(result.targetVersion?.versionNumber)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">schema_hash</dt>
              <dd className="text-right">{formatValue(result.targetVersion?.schemaHash)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Validation source</dt>
              <dd className="text-right">{targetSourceLabel}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-2 rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Coverage</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Sheets checked</dt>
              <dd>{result.sheetsChecked}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Rows checked</dt>
              <dd>{result.rowsChecked}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Submission ID</dt>
              <dd className="text-right break-all">{formatValue(result.submissionId)}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-2 rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Issue counts</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Errors</dt>
              <dd>{errorCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Warnings</dt>
              <dd>{warningCount}</dd>
            </div>
          </dl>
        </div>

        {submissionSaved && (
          <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-4 xl:col-span-3">
            <h3 className="text-sm font-semibold text-green-900">Submission saved successfully</h3>
            <p className="text-sm text-green-800">
              {hasIssues
                ? 'The workbook completed validation without blocking errors, and a validated submission record was created.'
                : 'No errors or warnings were returned for the uploaded workbook. A validated submission record was created.'}
            </p>
            {result.validationTargetSource === 'MANUAL_FALLBACK' && (
              <p className="text-sm text-green-800">
                This result came from manual fallback validation using the latest version of the selected template.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
