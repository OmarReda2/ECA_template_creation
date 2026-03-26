import { Badge } from '@/shared/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import type { SubmissionIdentifyResponse, SubmissionIdentifyStatus } from '../types';

function getBadgeVariant(status: SubmissionIdentifyStatus) {
  switch (status) {
    case 'EXACT_MATCH':
      return 'success';
    case 'HASH_MISMATCH':
      return 'warning';
    case 'METADATA_MISSING':
    case 'METADATA_INVALID':
    case 'VERSION_NOT_FOUND':
    case 'UNSUPPORTED_FILE':
      return 'destructive';
    default:
      return 'neutral';
  }
}

function formatValue(value: string | number | null | undefined) {
  return value == null || value === '' ? 'Not available' : String(value);
}

function valueClassName(value?: string | number | null) {
  const isLong = typeof value === 'string' && value.length > 24;
  return isLong
    ? 'max-w-[18rem] break-all text-right font-mono text-xs leading-5'
    : 'text-right';
}

function getStatusDescription(status: SubmissionIdentifyStatus) {
  switch (status) {
    case 'EXACT_MATCH':
      return 'Workbook metadata matched a stored template version exactly. Validation can proceed.';
    case 'HASH_MISMATCH':
      return 'Workbook metadata resolved a version, but the schema hash did not match. Validation is blocked until the workbook is corrected or replaced.';
    case 'METADATA_MISSING':
      return "Workbook metadata sheet '__metadata__' was not found. Validation cannot proceed automatically.";
    case 'METADATA_INVALID':
      return 'Workbook metadata is incomplete or malformed. Validation cannot proceed automatically.';
    case 'VERSION_NOT_FOUND':
      return 'Workbook metadata referenced a version that is not available in the system. Validation cannot proceed.';
    case 'UNSUPPORTED_FILE':
      return 'The uploaded file is not a supported workbook. Upload a valid .xlsx file to continue.';
    default:
      return 'Identification result returned by backend.';
  }
}

interface IdentityResultCardProps {
  result: SubmissionIdentifyResponse;
}

export function IdentityResultCard({ result }: IdentityResultCardProps) {
  const { metadata, resolvedVersion, messages, status } = result;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Identification Result</CardTitle>
            <CardDescription>Step 1 reads workbook metadata and compares it with stored template versions.</CardDescription>
          </div>
          <Badge variant={getBadgeVariant(status)}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-4">
            <h3 className="text-sm font-semibold text-foreground">Extracted metadata</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">template_id</dt>
                <dd className={valueClassName(metadata?.templateId)}>{formatValue(metadata?.templateId)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">version_id</dt>
                <dd className={valueClassName(metadata?.versionId)}>{formatValue(metadata?.versionId)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">version_number</dt>
                <dd className={valueClassName(metadata?.versionNumber)}>{formatValue(metadata?.versionNumber)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">schema_hash</dt>
                <dd className={valueClassName(metadata?.schemaHash)}>{formatValue(metadata?.schemaHash)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-4">
            <h3 className="text-sm font-semibold text-foreground">Resolved system version</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Template</dt>
                <dd className={valueClassName(resolvedVersion?.templateName)}>{formatValue(resolvedVersion?.templateName)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Version</dt>
                <dd className={valueClassName(resolvedVersion?.versionNumber)}>{formatValue(resolvedVersion?.versionNumber)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">version_id</dt>
                <dd className={valueClassName(resolvedVersion?.versionId)}>{formatValue(resolvedVersion?.versionId)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">schema_hash</dt>
                <dd className={valueClassName(resolvedVersion?.schemaHash)}>{formatValue(resolvedVersion?.schemaHash)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div
          className={`rounded-md border p-4 text-sm ${
            status === 'EXACT_MATCH'
              ? 'border-green-200 bg-green-50 text-green-900'
              : status === 'HASH_MISMATCH'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {getStatusDescription(status)}
        </div>

        {messages.length > 0 && (
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Messages</h3>
              <Badge variant="neutral">Details</Badge>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
