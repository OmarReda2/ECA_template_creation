import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { submissionApi } from '../api';
import type { SubmissionIdentifyResponse } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { Skeleton } from '@/shared/ui/skeleton';
import { useToast } from '@/shared/ui/Toast';
import { normalizeHttpError, getErrorMessage, type FrontendError } from '@/shared/errors/errorTypes';

const IDENTIFY_MIN_LOADING_MS = 600;

interface UploadIdentifyStepProps {
  onIdentified: (file: File, result: SubmissionIdentifyResponse) => void;
  onIdentifyStart?: (file: File) => void;
  onError?: (error: FrontendError | null) => void;
}

export function UploadIdentifyStep({ onIdentified, onIdentifyStart, onError }: UploadIdentifyStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { showErrorToast } = useToast();

  const identifyFile = async (nextFile: File) => {
    setFile(nextFile);
    setSubmitting(true);
    try {
      onIdentifyStart?.(nextFile);
      onError?.(null);
      const [result] = await Promise.all([
        submissionApi.identify(nextFile),
        new Promise((resolve) => setTimeout(resolve, IDENTIFY_MIN_LOADING_MS)),
      ]);
      onIdentified(nextFile, result);
    } catch (error) {
      const normalized = normalizeHttpError(error);
      onError?.(normalized);
      showErrorToast(getErrorMessage(normalized, true));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (nextFile == null) {
      return;
    }

    void identifyFile(nextFile);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload &amp; Identify Template</CardTitle>
        <CardDescription>
          Select the filled workbook and identification will start automatically. Step 1 reads workbook metadata before any validation is allowed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          htmlFor="submission-file"
          className="group block cursor-pointer"
          onClick={(event) => {
            if (submitting) {
              event.preventDefault();
            }
          }}
        >
          <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/25 px-6 py-10 text-center transition-all duration-150 group-hover:border-primary/60 group-hover:bg-muted/55 group-hover:shadow-sm group-focus-within:border-primary/60 group-focus-within:bg-muted/55">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {file?.name ?? 'Choose an .xlsx workbook'}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              Hidden workbook metadata will be inspected first. Validation can run only after a usable target is resolved.
            </span>

            {submitting && (
              <div className="mt-5 w-full rounded-md border border-primary/20 bg-background/80 p-4 text-left shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Spinner className="h-4 w-4" />
                  Identifying workbook metadata...
                </div>
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            )}

            {!submitting && file != null && (
              <div className="mt-5 w-full rounded-md border border-border bg-background/80 px-4 py-3 text-left text-sm text-muted-foreground shadow-sm">
                Selected workbook: <span className="font-medium text-foreground">{file.name}</span>
              </div>
            )}
          </div>
        </label>

        <input
          ref={inputRef}
          id="submission-file"
          type="file"
          accept=".xlsx"
          className="sr-only"
          onChange={handleFileChange}
          disabled={submitting}
        />
      </CardContent>
    </Card>
  );
}
