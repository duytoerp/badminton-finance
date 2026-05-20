import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Shell({ children }: { children: ReactNode }) {
  const desktop = useIsDesktop();
  const loc = useLocation();
  const onLogin = loc.pathname === '/login';

  if (onLogin) return <>{children}</>;

  if (desktop) {
    return (
      <div className="shell-desktop">
        <Sidebar />
        <main>{children}</main>
      </div>
    );
  }
  return (
    <div className="app-shell">
      {children}
      <BottomNav />
    </div>
  );
}

export function PageHeader({
  title, subtitle, actions
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}
