import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface PageHeaderProps {
  /** Omit when Topbar/Sidebar already show the page title to avoid duplication. */
  title?: string;
  description?: ReactNode;
  rightActions?: ReactNode;
  className?: string;
}

/** Consistent spacing and typography for page headers. */
export function PageHeader({ title, description, rightActions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 pb-6',
        className
      )}
    >
      <div>
        {title != null && (
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        )}
        {description != null && (
          <div className={cn('text-sm text-muted-foreground', title != null && 'mt-1')}>
            {description}
          </div>
        )}
      </div>
      {rightActions != null && <div className="flex items-center gap-2">{rightActions}</div>}
    </div>
  );
}
