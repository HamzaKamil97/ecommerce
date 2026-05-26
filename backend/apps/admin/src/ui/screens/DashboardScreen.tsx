import { useNavigate } from 'react-router-dom';
import { SalesChart } from '../components/SalesChart';
import { TopSkusTable } from '../components/TopSkusTable';
import { AlertsPanel } from '../components/AlertsPanel';
import { useAdminSession } from '../../state/session';

export function DashboardScreen() {
  const nav = useNavigate();
  const vendor = useAdminSession((s) => s.vendor_id);
  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>Dashboard — vendor {vendor || '(none)'}</h1>
        <button onClick={() => { useAdminSession.getState().signOut(); nav('/login'); }}>Sign out</button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <SalesChart />
        <AlertsPanel />
        <div style={{ gridColumn: '1 / -1' }}><TopSkusTable /></div>
      </div>
    </div>
  );
}
