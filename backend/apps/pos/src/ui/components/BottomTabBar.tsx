import { NavLink } from 'react-router-dom';
import './BottomTabBar.css';

export type TabItem = {
  key: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
};

export type BottomTabBarProps = {
  items: TabItem[];
  active: string;
};

export function BottomTabBar({ items, active }: BottomTabBarProps) {
  return (
    <nav className="tab-bar" role="navigation" aria-label="Primary">
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <NavLink
            key={it.key}
            to={it.href}
            end
            className={() => `tab-item ${isActive ? 'active' : ''}`}
          >
            <span className="tab-item-icon" aria-hidden="true">
              {it.icon}
              {typeof it.badge === 'number' && it.badge > 0 ? (
                <span className="tab-item-badge">{it.badge}</span>
              ) : null}
            </span>
            <span className="tab-item-label">{it.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
