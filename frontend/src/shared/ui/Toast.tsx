import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type ToastVariant = 'info' | 'success' | 'error';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

interface ToastProviderProps {
  children: ReactNode;
  /** Auto-dismiss after this many ms; 0 = no auto-dismiss. */
  durationMs?: number;
}

export function ToastProvider({ children, durationMs = DEFAULT_DURATION_MS }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (durationMs > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, durationMs);
      }
    },
    [durationMs]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

const variantClasses: Record<ToastVariant, string> = {
  info: 'bg-neutral-900 text-white',
  success: 'bg-green-700 text-white',
  error: 'bg-red-600 text-white',
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center justify-between gap-4 rounded-lg px-4 py-3 shadow-lg ${variantClasses[t.variant]}`}
          role="status"
        >
          <p className="text-sm font-medium">{t.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 rounded p-1 opacity-80 hover:opacity-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/** Presentational Toast (for use outside context if needed). */
interface ToastProps {
  message: string;
  variant?: ToastVariant;
  action?: ReactNode;
}

export function Toast({ message, variant = 'info', action }: ToastProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg px-4 py-3 shadow-lg ${variantClasses[variant]}`}
      role="status"
    >
      <p className="text-sm font-medium">{message}</p>
      {action}
    </div>
  );
}
