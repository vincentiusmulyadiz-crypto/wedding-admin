import type { TabType } from '../components/Navbar';

const TAB_TO_PATH: Record<TabType, string> = {
  overview: '/',
  guests: '/tamu',
  links: '/tautan',
  tables: '/meja',
  tutorial: '/panduan',
  customers: '/pelanggan',
};

const PATH_TO_TAB: Record<string, TabType> = Object.entries(TAB_TO_PATH).reduce(
  (acc, [tab, path]) => {
    acc[path] = tab as TabType;
    return acc;
  },
  {} as Record<string, TabType>
);

export function getAdminTabFromPath(pathname: string): TabType {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PATH_TO_TAB[clean] || 'overview';
}

export function getPathFromAdminTab(tab: TabType): string {
  return TAB_TO_PATH[tab] || '/';
}

export function syncAdminTabUrl(tab: TabType, replace = false): void {
  if (typeof window === 'undefined') return;
  const targetPath = getPathFromAdminTab(tab);
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (currentPath === targetPath) return;
  const nextUrl = `${targetPath}${window.location.search}${window.location.hash}`;
  if (replace) {
    window.history.replaceState({ tab }, '', nextUrl);
  } else {
    window.history.pushState({ tab }, '', nextUrl);
  }
}
