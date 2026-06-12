/** Backend ErrorResponse shape (raw). */

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  traceId?: string | null;
  fieldErrors?: ApiFieldError[];
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'error' in value &&
    'message' in value
  );
}

/** Normalized frontend error (mapped from backend or network). */
export interface FrontendError {
  message: string;
  status: number | null;
  path: string | null;
  traceId: string | null;
  errorCode: string | null;
  fieldErrors: ApiFieldError[];
}

/**
 * Extract a normalized FrontendError from backend ErrorResponse or other error.
 */
export function normalizeError(raw: unknown): FrontendError {
  const empty: FrontendError = {
    message: 'An unexpected error occurred',
    status: null,
    path: null,
    traceId: null,
    errorCode: null,
    fieldErrors: [],
  };

  if (isApiErrorResponse(raw)) {
    return {
      message: raw.message,
      status: raw.status,
      path: raw.path ?? null,
      traceId: raw.traceId ?? null,
      errorCode: raw.error ?? null,
      fieldErrors: raw.fieldErrors ?? [],
    };
  }

  if (raw instanceof Error) {
    return { ...empty, message: raw.message };
  }

  return empty;
}

/** Helper: get display message from FrontendError (optionally with field errors). */
export function getErrorMessage(e: FrontendError, includeFieldErrors = false): string {
  if (!includeFieldErrors || e.fieldErrors.length === 0) return e.message;
  const fieldLines = e.fieldErrors.map((f) => `${f.field}: ${f.message}`).join('; ');
  return `${e.message} (${fieldLines})`;
}

/** Normalize error from axios (use response.data and response.status when present). */
export function normalizeHttpError(error: unknown): FrontendError {
  const err = error as { response?: { data?: unknown; status?: number } };
  const data = err?.response?.data;
  const status = err?.response?.status;
  const normalized = normalizeError(data ?? error);
  return { ...normalized, status: status ?? normalized.status };
}
