import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

const titleByPath: Record<string, string> = {
  '/templates': 'Templates',
  '/': 'Templates',
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/templates/') && pathname.includes('/versions/') && pathname.includes('/schema')) {
    return 'Schema Editor';
  }
  if (pathname.match(/^\/templates\/[^/]+$/)) {
    return 'Template Details';
  }
  return titleByPath[pathname] ?? 'Template Creation Admin';
}

interface TopbarProps {
  rightActions?: ReactNode;
}

/** Page title from route and optional right slot. Card-like border using design tokens. */
export default function Topbar({ rightActions }: TopbarProps) {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
      {rightActions != null && <div className="flex items-center gap-2 shrink-0">{rightActions}</div>}
    </header>
  );
}
