import { useSession } from '../../state/session';

export function StatusBar({ online, queueDepth }: { online: boolean; queueDepth: number }) {
  const cashier = useSession((s) => s.cashier_name);
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
