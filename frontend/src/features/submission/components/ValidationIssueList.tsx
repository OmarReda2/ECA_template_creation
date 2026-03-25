import { Badge } from '@/shared/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import type {
  SubmissionValidationIssue,
  SubmissionValidationResponse,
  SubmissionValidationSheetIssue,
} from '../types';

function IssueSection({
  title,
  description,
  issues,
  variant,
}: {
  title: string;
  description: string;
  issues: SubmissionValidationIssue[];
  variant: 'destructive' | 'warning';
}) {
  if (issues.length === 0) {
    return null;
  }

  const groupedIssues = issues
    .slice()
    .sort((left, right) => {
      const leftSheet = left.sheetName ?? 'Workbook';
      const rightSheet = right.sheetName ?? 'Workbook';
      if (leftSheet !== rightSheet) return leftSheet.localeCompare(rightSheet);
      const leftRow = left.rowNumber ?? 0;
      const rightRow = right.rowNumber ?? 0;
      if (leftRow !== rightRow) return leftRow - rightRow;
      return (left.headerName ?? '').localeCompare(right.headerName ?? '');
    })
    .reduce<Record<string, SubmissionValidationIssue[]>>((groups, issue) => {
      const key = issue.sheetName ?? 'Workbook';
      groups[key] = [...(groups[key] ?? []), issue];
      return groups;
    }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={variant}>{issues.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(groupedIssues).map(([sheetName, grouped]) => (
          <div key={sheetName} className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">{sheetName}</h3>
              <Badge variant="outline">{grouped.length}</Badge>
            </div>
            {grouped.map((issue, index) => (
              <div
                key={`${issue.code}-${sheetName}-${issue.rowNumber ?? 'na'}-${issue.headerName ?? 'na'}-${index}`}
                className={`rounded-md border p-4 ${
                  variant === 'destructive'
                    ? 'border-red-200 bg-red-50/70'
                    : 'border-amber-200 bg-amber-50/70'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={variant}>{issue.severity}</Badge>
                  <Badge variant="outline">{issue.code}</Badge>
                </div>
                <p className="mt-3 text-sm text-foreground">{issue.message}</p>
                <dl className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                  <div>
                    <dt className="font-medium">Sheet</dt>
                    <dd>{issue.sheetName ?? 'Workbook'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Row</dt>
                    <dd>{issue.rowNumber ?? 'Not applicable'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Header</dt>
                    <dd>{issue.headerName ?? 'Not applicable'}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SheetIssueSection({ sheetIssues }: { sheetIssues: SubmissionValidationSheetIssue[] }) {
  if (sheetIssues.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sheet Structure Notes</CardTitle>
        <CardDescription>Header-level structure issues returned by backend validation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sheetIssues.map((sheetIssue) => (
          <div key={sheetIssue.sheetName} className="rounded-md border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">{sheetIssue.sheetName}</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Missing headers</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {sheetIssue.missingHeaders.length > 0 ? (
                    sheetIssue.missingHeaders.map((header) => <li key={header}>{header}</li>)
                  ) : (
                    <li className="text-muted-foreground">None</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Extra headers</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {sheetIssue.extraHeaders.length > 0 ? (
                    sheetIssue.extraHeaders.map((header) => <li key={header}>{header}</li>)
                  ) : (
                    <li className="text-muted-foreground">None</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface ValidationIssueListProps {
  result: SubmissionValidationResponse;
}

export function ValidationIssueList({ result }: ValidationIssueListProps) {
  const errors = result.errors ?? [];
  const warnings = result.warnings ?? [];
  const sheetIssues = result.sheetIssues ?? [];

  if (errors.length === 0 && warnings.length === 0 && sheetIssues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validation Issues</CardTitle>
          <CardDescription>No errors or warnings were returned by backend validation.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <IssueSection
        title="Errors"
        description="These issues block a clean workbook validation result."
        issues={errors}
        variant="destructive"
      />
      <IssueSection
        title="Warnings"
        description="These issues do not block the workbook, but should still be reviewed."
        issues={warnings}
        variant="warning"
      />
      <SheetIssueSection sheetIssues={sheetIssues} />
    </div>
  );
}
