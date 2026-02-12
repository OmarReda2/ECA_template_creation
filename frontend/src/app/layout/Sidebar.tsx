import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/templates', label: 'Templates' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white">
      <div className="flex h-full flex-col py-4">
        <div className="px-4 text-sm font-medium text-neutral-500 uppercase tracking-wider">
          Admin
        </div>
        <nav className="mt-4 flex flex-col gap-0.5 px-3">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`
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
