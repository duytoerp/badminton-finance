import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/',          label: 'Trang chủ', icon: '🏠' },
  { to: '/sessions',  label: 'Buổi đánh', icon: '🏸' },
  { to: '/players',   label: 'Người chơi', icon: '👥' },
  { to: '/fund',      label: 'Quỹ',       icon: '💰' },
  { to: '/reports',   label: 'Báo cáo',   icon: '📊' }
];

export default function BottomNav() {
  return (
    <nav className="bottomnav" role="navigation">
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end className={({isActive}) => isActive ? 'active' : ''}>
          <span className="icon" aria-hidden>{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
