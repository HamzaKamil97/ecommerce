import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import './SidebarItem.css';

export function SidebarItem({
  to, icon, label, locked, badge,
}: { to: string; icon: ReactNode; label: string; locked?: boolean; badge?: ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : ''} ${locked ? 'sidebar-item-locked' : ''}`}>
      <span className="sidebar-icon">{icon}</span>
      <span className="sidebar-label">{label}</span>
      {locked && <span className="sidebar-lock">🔒</span>}
      {badge && <span className="sidebar-badge">{badge}</span>}
    </NavLink>
  );
}
