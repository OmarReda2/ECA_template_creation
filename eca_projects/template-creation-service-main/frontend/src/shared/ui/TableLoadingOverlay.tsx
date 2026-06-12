import { type ReactNode } from 'react';
import { Spinner } from '@/shared/ui/Spinner';

interface TableLoadingOverlayProps {
  loading: boolean;
  children: ReactNode;
  /** Optional class for the wrapper (e.g. min-h for empty tables). */
  className?: string;
}

/**
 * Wraps table (or any) content and shows a subtle overlay + spinner while loading.
 * Keeps current data visible underneath to avoid blank flash; disables interaction.
 */
export function TableLoadingOverlay({
  loading,
  children,
  className = '',
}: TableLoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {loading && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1px]"
          aria-busy="true"
          aria-live="polite"
        >
          <Spinner className="h-8 w-8 text-neutral-500" />
        </div>
      )}
    </div>
  );
}
