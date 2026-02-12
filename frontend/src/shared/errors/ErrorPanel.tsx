import type { ApiErrorResponse } from './errorTypes';

interface ErrorPanelProps {
  error: ApiErrorResponse | string;
  onDismiss?: () => void;
}

export function ErrorPanel({ error, onDismiss }: ErrorPanelProps) {
  const message = typeof error === 'string' ? error : error.message;
  const fieldErrors = typeof error === 'object' && error.fieldErrors?.length ? error.fieldErrors : null;

  return (
    <div
      className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{message}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded p-1 hover:bg-red-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
      {fieldErrors && (
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-red-700">
          {fieldErrors.map((fe, i) => (
            <li key={i}>
              {fe.field}: {fe.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
