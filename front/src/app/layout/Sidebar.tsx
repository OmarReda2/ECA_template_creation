import { NavLink, useLocation } from 'react-router-dom';
import { FilePlus, FileText } from 'lucide-react';
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

/** App sidebar using shadcn Sidebar block. Nav: Templates (/templates), Create Template (/templates/create). */
export default function AppSidebar() {
  const location = useLocation();
  const isCreateActive = location.pathname.startsWith('/templates/create');
  const isTemplatesActive =
    (location.pathname === '/templates' || location.pathname.startsWith('/templates/')) &&
    !isCreateActive;

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
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Create Template" isActive={isCreateActive}>
                  <NavLink to="/templates/create">
                    <FilePlus className="h-4 w-4 shrink-0" />
                    <span>Create Template</span>
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
