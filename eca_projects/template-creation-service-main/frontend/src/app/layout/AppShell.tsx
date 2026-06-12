import { Outlet } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/shared/ui/sidebar';
import { BreadcrumbProvider } from './BreadcrumbContext';
import AppSidebar from './Sidebar';
import Topbar from './Topbar';

/** Layout: shadcn SidebarProvider + sidebar + SidebarInset (main content shifts with collapse). */
export default function AppShell() {
  return (
    <BreadcrumbProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col min-w-0">
            <Topbar />
            <div className="flex-1 p-6">
              <div className="mx-auto max-w-6xl">
                <Outlet />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}
