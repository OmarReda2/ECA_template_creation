import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

const navItems = [
  { to: '/templates', label: 'Templates' },
  // Placeholder for future nav items
];

/** Ghost-button style nav items with active state from current route. */
export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card">
      <div className="flex h-full flex-col py-4">
        <div className="px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Admin
        </div>
        <nav className="mt-4 flex flex-col gap-0.5 px-3" aria-label="Main">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/templates'}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-9 w-full items-center justify-start rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
