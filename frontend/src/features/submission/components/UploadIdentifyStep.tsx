import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { submissionApi } from '../api';
import type { SubmissionIdentifyResponse } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { useToast } from '@/shared/ui/Toast';
import { normalizeHttpError, getErrorMessage } from '@/shared/errors/errorTypes';

interface UploadIdentifyStepProps {
  onResult: (result: SubmissionIdentifyResponse | null) => void;
}

export function UploadIdentifyStep({ onResult }: UploadIdentifyStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { showErrorToast } = useToast();

  useEffect(() => {
    onResult(null);
  }, [file, onResult]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (file == null) {
      showErrorToast('Choose an Excel workbook before continuing.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submissionApi.identify(file);
      onResult(result);
    } catch (error) {
      const normalized = normalizeHttpError(error);
      showErrorToast(getErrorMessage(normalized, true));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload &amp; Identify Template</CardTitle>
        <CardDescription>Upload the filled workbook so the system can read its metadata and resolve the source template version.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label
            htmlFor="submission-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center"
          >
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {file?.name ?? 'Choose an .xlsx workbook'}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              Hidden workbook metadata will be inspected. No validation runs in this slice.
            </span>
          </label>

          <input
            id="submission-file"
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={submitting}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || file == null}>
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Identifying...
                </>
              ) : (
                'Identify Workbook'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
