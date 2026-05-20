import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';

const groups: { title: string; items: { to: string; label: string; icon: string }[] }[] = [
  {
    title: 'Tổng quan',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊' }
    ]
  },
  {
    title: 'Vận hành',
    items: [
      { to: '/sessions', label: 'Buổi đánh', icon: '🏸' },
      { to: '/players', label: 'Người chơi', icon: '👥' },
      { to: '/courts', label: 'Sân', icon: '🏟️' },
      { to: '/debts', label: 'Công nợ', icon: '💸' },
      { to: '/fund', label: 'Quỹ', icon: '💰' }
    ]
  },
  {
    title: 'Báo cáo',
    items: [
      { to: '/reports', label: 'Báo cáo thu chi', icon: '📈' }
    ]
  },
  {
    title: 'Quản trị',
    items: [
      { to: '/admin/pricing-templates', label: 'Template thu tiền', icon: '💵' },
      { to: '/admin/users', label: 'Người dùng', icon: '🔐' },
      { to: '/admin/audit', label: 'Audit log', icon: '📜' }
    ]
  }
];

export default function Sidebar() {
  const { userName, fullName, logout } = useAuth();
  const nav = useNavigate();
  return (
    <aside className="sidebar">
      <div className="brand">🏸 Quỹ Cầu Lông</div>
      {groups.map(g => (
        <div key={g.title}>
          <div className="nav-group">{g.title}</div>
          {g.items.map(it => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => isActive ? 'active' : ''}>
              <span>{it.icon}</span><span>{it.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
      <div className="user-tag">
        <b>{fullName || userName}</b>
        <span>@{userName}</span>
        <button className="logout" onClick={() => { logout(); nav('/login', { replace: true }); }}>Đăng xuất</button>
      </div>
    </aside>
  );
}
