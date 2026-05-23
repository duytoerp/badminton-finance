import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Shell from './components/layout/Shell';
import Toaster from './components/common/Toaster';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Players from './pages/Players';
import PlayerDetail from './pages/PlayerDetail';
import PlayerGroups from './pages/PlayerGroups';
import Sessions from './pages/Sessions';
import SessionDetail from './pages/SessionDetail';
import Fund from './pages/Fund';
import Reports from './pages/Reports';
import Debts from './pages/Debts';
import Courts from './pages/Courts';
import Bookings from './pages/Bookings';
import UsersAdmin from './pages/admin/Users';
import AuditLog from './pages/admin/AuditLog';
import PricingTemplatesAdmin from './pages/admin/PricingTemplates';
import ExpenseTemplatesAdmin from './pages/admin/ExpenseTemplates';
import MaintenanceAdmin from './pages/admin/Maintenance';
import PermissionsAdmin from './pages/admin/Permissions';
import Login from './pages/Login';
import { useAuth } from './store/auth';
import { useIsDesktop } from './hooks/useBreakpoint';
import './styles/desktop.css';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuth(s => s.token);
  const loc = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

function RequireRole({ roles, children }: { roles: string[]; children: JSX.Element }) {
  const token = useAuth(s => s.token);
  const userRoles = useAuth(s => s.roles);
  const loc = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />;
  const ok = roles.some(r => userRoles.includes(r));
  if (!ok) return <Navigate to="/" state={{ forbidden: true }} replace />;
  return children;
}

function HomeOrDashboard() {
  const desktop = useIsDesktop();
  return desktop ? <Dashboard /> : <Home />;
}

export default function App() {
  return (
    <Shell>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/"            element={<RequireAuth><HomeOrDashboard /></RequireAuth>} />
        <Route path="/dashboard"   element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/players"     element={<RequireAuth><Players /></RequireAuth>} />
        <Route path="/players/:id" element={<RequireAuth><PlayerDetail /></RequireAuth>} />
        <Route path="/player-groups" element={<RequireAuth><PlayerGroups /></RequireAuth>} />
        <Route path="/sessions"    element={<RequireAuth><Sessions /></RequireAuth>} />
        <Route path="/sessions/:id" element={<RequireAuth><SessionDetail /></RequireAuth>} />
        <Route path="/courts"      element={<RequireAuth><Courts /></RequireAuth>} />
        <Route path="/bookings"    element={<RequireAuth><Bookings /></RequireAuth>} />
        <Route path="/debts"       element={<RequireAuth><Debts /></RequireAuth>} />
        <Route path="/fund"        element={<RequireAuth><Fund /></RequireAuth>} />
        <Route path="/reports"     element={<RequireAuth><Reports /></RequireAuth>} />
        <Route path="/admin/users" element={<RequireRole roles={["Admin"]}><UsersAdmin /></RequireRole>} />
        <Route path="/admin/audit" element={<RequireRole roles={["Admin"]}><AuditLog /></RequireRole>} />
        <Route path="/admin/pricing-templates" element={<RequireRole roles={["Admin"]}><PricingTemplatesAdmin /></RequireRole>} />
        <Route path="/admin/expense-templates" element={<RequireRole roles={["Admin"]}><ExpenseTemplatesAdmin /></RequireRole>} />
        <Route path="/admin/maintenance" element={<RequireRole roles={["Admin"]}><MaintenanceAdmin /></RequireRole>} />
        <Route path="/admin/permissions" element={<RequireRole roles={["Admin"]}><PermissionsAdmin /></RequireRole>} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
