import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';

interface NavItem { to: string; label: string; icon: string; adminOnly?: boolean }

const groups: { title: string; items: NavItem[] }[] = [
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
      { to: '/player-groups', label: 'Nhóm người chơi', icon: '👨‍👩‍👧' },
      { to: '/courts', label: 'Sân', icon: '🏟️' },
      { to: '/bookings', label: 'Đặt sân', icon: '📅' },
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
      { to: '/admin/pricing-templates', label: 'Template thu tiền', icon: '💵', adminOnly: true },
      { to: '/admin/expense-templates', label: 'Template chi phí', icon: '🧾', adminOnly: true },
      { to: '/admin/users', label: 'Người dùng', icon: '🔐', adminOnly: true },
      { to: '/admin/permissions', label: 'Phân quyền', icon: '🛡️', adminOnly: true },
      { to: '/admin/audit', label: 'Audit log', icon: '📜', adminOnly: true },
      { to: '/admin/maintenance', label: 'Xóa dữ liệu', icon: '🗑️', adminOnly: true }
    ]
  }
];

export default function Sidebar() {
  const { userName, fullName, logout, isAdmin } = useAuth();
  const admin = isAdmin();
  const nav = useNavigate();
  return (
    <aside className="sidebar">
      <div className="brand">🏸 Quỹ Cầu Lông</div>
      {groups.map(g => {
        const visible = g.items.filter(it => !it.adminOnly || admin);
        if (visible.length === 0) return null;
        return (
          <div key={g.title}>
            <div className="nav-group">{g.title}</div>
            {visible.map(it => (
              <NavLink key={it.to} to={it.to} className={({ isActive }) => isActive ? 'active' : ''}>
                <span>{it.icon}</span><span>{it.label}</span>
              </NavLink>
            ))}
          </div>
        );
      })}
      <div className="user-tag">
        <b>{fullName || userName}</b>
        <span>@{userName}</span>
        <button className="logout" onClick={() => { logout(); nav('/login', { replace: true }); }}>Đăng xuất</button>
      </div>
    </aside>
  );
}
