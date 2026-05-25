import { useSession } from '../../state/session';
import { useNet } from '../../sync/network-status';

export function StatusBar() {
  const cashier = useSession((s) => s.cashier_name);
  const online = useNet((s) => s.online);
  const queueDepth = useNet((s) => s.queueDepth);
  return (
    <header style={{ display: 'flex', alignItems: 'center', padding: 8,
      background: '#111', borderBottom: '1px solid #222', gap: 12 }}>
      <strong>Hanoot PoS</strong>
      <span style={{ flex: 1 }} />
      <span aria-label="cashier">{cashier ?? '—'}</span>
      <span aria-label="queue">queue {queueDepth}</span>
      <span aria-label="net" style={{ color: online ? 'var(--accent)' : 'var(--danger)' }}>
        {online ? '● online' : '● offline'}
      </span>
    </header>
  );
}
