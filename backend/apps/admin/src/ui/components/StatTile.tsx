import { HTMLAttributes, ReactNode } from 'react';
import './StatTile.css';

export type StatTileProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  num: ReactNode;
  trend?: ReactNode;
  trendDir?: 'up' | 'down' | 'flat';
  icon?: ReactNode;
};

export function StatTile({ label, num, trend, trendDir = 'flat', icon, className, ...rest }: StatTileProps) {
  return (
    <div className={`stat-tile ${className ?? ''}`} {...rest}>
      {icon && <span className="stat-icon">{icon}</span>}
      <div className="stat-label">{label}</div>
      <div className="stat-num numeric">{num}</div>
      {trend && <div className={`stat-trend stat-trend-${trendDir}`}>{trend}</div>}
    </div>
  );
}
