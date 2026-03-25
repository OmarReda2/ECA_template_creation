import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { ErrorPanel } from '@/shared/errors/ErrorPanel';
import { getErrorMessage, normalizeHttpError, type FrontendError } from '@/shared/errors/errorTypes';
import { submissionApi } from '../api';
import type { SubmissionHistoryItem } from '../types';

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

export default function SubmissionHistoryPage() {
  const [items, setItems] = useState<SubmissionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FrontendError | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const response = await submissionApi.list();
        if (!cancelled) {
          setItems(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(normalizeHttpError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Submission History"
        description="Read-only view of validated submissions saved by the current submission flow."
      />

      {error != null && (
        <ErrorPanel error={getErrorMessage(error, true)} onDismiss={() => setError(null)} />
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Loading submission history...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No saved submissions yet</CardTitle>
            <CardDescription>
              Submission history will appear here after a workbook passes validation and is saved.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{item.templateName ?? 'Unknown template'}</CardTitle>
                    <CardDescription>
                      Submission ID: <span className="break-all">{item.id}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="success">{item.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Version</div>
                  <div>{formatValue(item.versionNumber)}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Created</div>
                  <div>{formatDate(item.createdAt)}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Original file</div>
                  <div className="break-all">{formatValue(item.originalFileName)}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">schema_hash</div>
                  <div className="break-all">{formatValue(item.schemaHash)}</div>
                </div>
              </CardContent>
              <CardContent className="pt-0">
                <Button asChild type="button" variant="outline" size="sm">
                  <Link to={`/submissions/${item.id}`}>View details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
