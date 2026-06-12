import { useState } from 'react';
import { toast as sonnerToast } from 'sonner';

export type ToastVariant = 'info' | 'success' | 'error';

/** User-friendly short message for API errors by status. */
function userFriendlyMessage(message: string, status: number | null): string {
  if (status == null) return message;
  if (status === 400) return 'Invalid request.';
  if (status === 409) return 'Conflict: this version cannot be edited.';
  if (status >= 500) return 'Server error. Please try again later.';
  return message;
}

/** Expandable "View details" content for error toasts. */
function ExpandableErrorDetails({ details }: { details: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-1">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-left text-xs underline opacity-90 hover:opacity-100"
        >
          View details
        </button>
      ) : (
        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs opacity-90">
          {details}
        </pre>
      )}
    </div>
  );
}

export interface ShowErrorOptions {
  /** HTTP status for user-friendly title (400, 409, 500). */
  status?: number | null;
  /** Full error text for "View details" expandable; defaults to message. */
  details?: string;
  /** Optional retry callback; adds a "Retry" action to the toast. */
  onRetry?: () => void;
}

/**
 * Show an error toast with optional expandable details and retry action.
 * Uses a short user-friendly message as title when status is provided.
 */
export function showErrorToast(message: string, options?: ShowErrorOptions): void {
  const { status = null, details = message, onRetry } = options ?? {};
  const shortMessage = userFriendlyMessage(message, status);
  sonnerToast.error(shortMessage, {
    description: details ? <ExpandableErrorDetails details={details} /> : undefined,
    action: onRetry ? { label: 'Retry', onClick: onRetry } : undefined,
    duration: details ? 10000 : 5000,
  });
}

export interface UseToastReturn {
  showToast: (message: string, variant?: ToastVariant) => void;
  showErrorToast: typeof showErrorToast;
}

/**
 * Single toast API backed by sonner.
 * Use for success/info toasts and for API errors (with optional details and retry).
 */
export function useToast(): UseToastReturn {
  const showToast = (message: string, variant: ToastVariant = 'info') => {
    switch (variant) {
      case 'success':
        sonnerToast.success(message);
        break;
      case 'error':
        sonnerToast.error(message);
        break;
      default:
        sonnerToast(message);
    }
  };

  return { showToast, showErrorToast };
}
