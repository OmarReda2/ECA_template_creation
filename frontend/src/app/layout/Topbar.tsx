import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/Breadcrumb';
import { SidebarTrigger } from '@/shared/ui/sidebar';
import { useBreadcrumb } from './BreadcrumbContext';

interface TopbarProps {
  rightActions?: ReactNode;
}

function AppTopbarBreadcrumbs() {
  const location = useLocation();
  const params = useParams<{ templateId?: string; versionId?: string }>();
  const { templateName, versionNumber } = useBreadcrumb() ?? {};
  const pathname = location.pathname;

  if (pathname.startsWith('/templates/create')) {
    return null;
  }

  const isSchema = pathname.includes('/versions/') && pathname.includes('/schema');
  const isTemplateDetails =
    params.templateId != null &&
    !pathname.includes('/versions/');

  if (isSchema && params.templateId != null) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/templates">Templates</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/templates/${params.templateId}`}>
                {templateName ?? 'Template'}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/templates/${params.templateId}`}>
                Version v{versionNumber ?? '?'}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Schema</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  if (isTemplateDetails && params.templateId != null) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/templates">Templates</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{templateName ?? 'Template'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Templates</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Page breadcrumbs + optional right slot. Toggle sidebar via SidebarTrigger (Topbar left). */
export default function Topbar({ rightActions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger aria-label="Toggle sidebar" className="hover:bg-muted/80 -ml-2" />
        <div className="min-w-0 flex-1">
          <AppTopbarBreadcrumbs />
        </div>
      </div>
      {rightActions != null && (
        <div className="flex shrink-0 items-center gap-2">{rightActions}</div>
      )}
    </header>
  );
}
