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

export default function Topbar() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center border-b border-neutral-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
    </header>
  );
}
