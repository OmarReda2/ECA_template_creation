import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { ErrorPanel } from '@/shared/errors/ErrorPanel';
import { getErrorMessage, normalizeHttpError, type FrontendError } from '@/shared/errors/errorTypes';
import { submissionApi } from '../api';
import type { SubmissionDetails } from '../types';

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatValue(value: string | number | null | undefined) {
  return value == null || value === '' ? 'Not available' : String(value);
}

export default function SubmissionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [details, setDetails] = useState<SubmissionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FrontendError | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setDetails(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const submissionId = id;

    async function loadDetails() {
      setLoading(true);
      setError(null);
      try {
        const response = await submissionApi.getById(submissionId);
        if (!cancelled) {
          setDetails(response);
        }
      } catch (err) {
        if (!cancelled) {
          setDetails(null);
          setError(normalizeHttpError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isNotFound = error?.status === 404;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Submission Details"
        description="Read-only view of one saved submission record."
      />

      <div>
        <Button asChild type="button" variant="outline">
          <Link to="/submissions/history">Back to History</Link>
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Loading submission details...
          </CardContent>
        </Card>
      ) : error != null ? (
        isNotFound ? (
          <Card>
            <CardHeader>
              <CardTitle>Submission not found</CardTitle>
              <CardDescription>
                The requested submission does not exist or is no longer available.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ErrorPanel error={getErrorMessage(error, true)} onDismiss={() => setError(null)} />
        )
      ) : details == null ? (
        <Card>
          <CardHeader>
            <CardTitle>No submission details available</CardTitle>
            <CardDescription>
              The submission could not be loaded.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <CardTitle>{details.templateName ?? 'Unknown template'}</CardTitle>
                <CardDescription>
                  Submission ID: <span className="break-all">{details.id}</span>
                </CardDescription>
              </div>
              <Badge variant="success">{details.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-md border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">Resolved version</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Template name</dt>
                  <dd className="text-right">{formatValue(details.templateName)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Version number</dt>
                  <dd>{formatValue(details.versionNumber)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Template ID</dt>
                  <dd className="max-w-[16rem] break-all text-right">{formatValue(details.templateId)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Version ID</dt>
                  <dd className="max-w-[16rem] break-all text-right">{formatValue(details.versionId)}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-2 rounded-md border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">Saved submission</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="text-right">{formatDate(details.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Original file</dt>
                  <dd className="max-w-[16rem] break-all text-right">{formatValue(details.originalFileName)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">schema_hash</dt>
                  <dd className="max-w-[16rem] break-all text-right">{formatValue(details.schemaHash)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{formatValue(details.status)}</dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
