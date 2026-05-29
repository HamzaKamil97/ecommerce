import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useManagerSession } from '../../../state/manager-session';
import { useSpotlight } from '../../../state/spotlight';

const NAV_ITEMS = [
  { to: '/manager/catalog', label: '📦 Catalog' },
  { to: '/manager/catalog/search', label: '➕ Add product' },
  { to: '/manager/import', label: '📥 CSV import' },
  { to: '/manager/departments', label: '🏷 Departments' },
  { to: '/manager/tags', label: '🔖 Tags' },
  { to: '/manager/approvals', label: '⚠ Approvals' },
  { to: '/manager/pin-reset', label: '👥 PIN reset' },
  { to: '/manager/audit-log', label: '📋 Audit log' },
];

export function ManagerLayout() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const manager_name = useManagerSession((s) => s.manager_name);
  const openSpotlight = useSpotlight((s) => s.openSpotlight);

  // Global ⌘K / Ctrl+K opens the spotlight from anywhere inside /manager/*.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSpotlight();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSpotlight]);

  const itemStyle = (active: boolean): React.CSSProperties => ({
    padding: 12, display: 'block', color: active ? 'var(--accent)' : 'var(--text)',
    textDecoration: 'none', borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
  });

  // Exact-match the catalog root so the "Add product" sub-route doesn't also
  // light up the Catalog item.
  function isActive(to: string): boolean {
    if (to === '/manager/catalog') return pathname === to || pathname === '/manager';
    return pathname.startsWith(to);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <aside style={{ background: 'var(--surface)', padding: 8 }}>
        <h3 style={{ padding: 8 }}>Manager</h3>
        <p style={{ padding: 8, color: '#9CA3AF' }}>Signed in: {manager_name}</p>
        <nav className="mgr-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} style={itemStyle(isActive(item.to))}>{item.label}</Link>
          ))}
        </nav>
        <button onClick={() => { useManagerSession.getState().signOut(); nav('/'); }}
          style={{ margin: 8 }}>Exit Manager</button>
        <button onClick={() => nav('/')} style={{ margin: 8 }}>Back to Register</button>
      </aside>
      <main style={{ padding: 16 }}><Outlet /></main>
    </div>
  );
}
