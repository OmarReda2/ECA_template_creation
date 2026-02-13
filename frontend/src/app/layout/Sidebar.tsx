import { NavLink, useLocation } from 'react-router-dom';
import { FileText } from 'lucide-react';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/shared/ui/sidebar';

/** App sidebar using shadcn Sidebar block. Single nav item: Templates (/templates). */
export default function AppSidebar() {
  const location = useLocation();
  const isTemplatesActive =
    location.pathname === '/templates' || location.pathname.startsWith('/templates/');

  return (
    <SidebarRoot collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Templates" isActive={isTemplatesActive}>
                  <NavLink to="/templates" end>
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>Templates</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarRail />
      </SidebarFooter>
    </SidebarRoot>
  );
}
