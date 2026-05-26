import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useManagerSession } from '../../../state/manager-session';

export function ManagerLayout() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const manager_name = useManagerSession((s) => s.manager_name);
  const itemStyle = (active: boolean): React.CSSProperties => ({
    padding: 12, display: 'block', color: active ? 'var(--accent)' : 'var(--text)',
    textDecoration: 'none', borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <aside style={{ background: 'var(--surface)', padding: 8 }}>
        <h3 style={{ padding: 8 }}>Manager</h3>
        <p style={{ padding: 8, color: '#9CA3AF' }}>Signed in: {manager_name}</p>
        <Link to="/manager/catalog" style={itemStyle(pathname.startsWith('/manager/catalog'))}>Catalog</Link>
        <Link to="/manager/import" style={itemStyle(pathname.startsWith('/manager/import'))}>CSV Import</Link>
        <button onClick={() => { useManagerSession.getState().signOut(); nav('/'); }}
          style={{ margin: 8 }}>Exit Manager</button>
        <button onClick={() => nav('/')} style={{ margin: 8 }}>Back to Register</button>
      </aside>
      <main style={{ padding: 16 }}><Outlet /></main>
    </div>
  );
}
