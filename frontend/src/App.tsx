import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Shell from './components/layout/Shell';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Players from './pages/Players';
import PlayerDetail from './pages/PlayerDetail';
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

function HomeOrDashboard() {
  const desktop = useIsDesktop();
  return desktop ? <Dashboard /> : <Home />;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/"            element={<RequireAuth><HomeOrDashboard /></RequireAuth>} />
        <Route path="/dashboard"   element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/players"     element={<RequireAuth><Players /></RequireAuth>} />
        <Route path="/players/:id" element={<RequireAuth><PlayerDetail /></RequireAuth>} />
        <Route path="/sessions"    element={<RequireAuth><Sessions /></RequireAuth>} />
        <Route path="/sessions/:id" element={<RequireAuth><SessionDetail /></RequireAuth>} />
        <Route path="/courts"      element={<RequireAuth><Courts /></RequireAuth>} />
        <Route path="/bookings"    element={<RequireAuth><Bookings /></RequireAuth>} />
        <Route path="/debts"       element={<RequireAuth><Debts /></RequireAuth>} />
        <Route path="/fund"        element={<RequireAuth><Fund /></RequireAuth>} />
        <Route path="/reports"     element={<RequireAuth><Reports /></RequireAuth>} />
        <Route path="/admin/users" element={<RequireAuth><UsersAdmin /></RequireAuth>} />
        <Route path="/admin/audit" element={<RequireAuth><AuditLog /></RequireAuth>} />
        <Route path="/admin/pricing-templates" element={<RequireAuth><PricingTemplatesAdmin /></RequireAuth>} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
