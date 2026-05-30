import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../../state/orders';
import type { OnlineOrder } from '../../api/onlineOrders';
import { VENDOR_ID } from '../../env';
import './OrderInboxScreen.css';

type Tab = 'pending' | 'picking' | 'done';
type Filter = 'all' | 'urgent' | 'high_value' | 'returning';

const URGENT_THRESHOLD_MS = 5 * 60 * 1000;
const NEW_THRESHOLD_MS = 5 * 60 * 1000;
const HIGH_VALUE_MINOR = 25_000_00; // 25k IQD = 2_500_000 minor? IQD is whole-unit currency; treat total_minor as IQD here.
// NOTE: IQD has no fractional unit in practice — total_minor here is IQD whole units per backend payload.
const HIGH_VALUE_THRESHOLD = 25_000;

function getVendorId(): string {
  // Use the env.ts VENDOR_ID constant: Vite statically replaces `import.meta.env.VITE_*`
  // there. Reading `(import.meta as any).env` inline does NOT get replaced (the cast
  // defeats the static match), so it was always undefined → silently fell back to v_test.
  return VENDOR_ID || 'v_test';
}

function ageMs(placed_at: string): number {
  const t = new Date(placed_at).getTime();
  if (Number.isNaN(t)) return 0;
  return Date.now() - t;
}

function formatTimeAgo(placed_at: string): string {
  const ms = ageMs(placed_at);
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hr ago';
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(placed_at).toLocaleDateString();
}

function formatMoney(total_minor: number, currency: string): string {
  // IQD doesn't divide — total_minor is whole IQD per existing backend payload convention.
  const code = (currency || 'iqd').toUpperCase();
  const value = total_minor.toLocaleString('en-US');
  return `${value} ${code}`;
}

function urgencyClass(order: OnlineOrder, tab: Tab): 'urgent' | 'new' | 'normal' | 'picking' {
  if (tab === 'picking') return 'picking';
  if (order.status === 'pending') {
    const age = ageMs(order.placed_at);
    if (age > URGENT_THRESHOLD_MS) return 'urgent';
    if (age < NEW_THRESHOLD_MS) return 'new';
  }
  return 'normal';
}

function itemPreview(order: OnlineOrder): { chips: string[]; more: number } {
  const lines = order.lines ?? [];
  const max = 5;
  const visible = lines.slice(0, max).map((l) => {
    const qty = l.qty > 1 ? ` ×${l.qty}` : '';
    return `${l.title}${qty}`;
  });
  const more = Math.max(0, lines.length - max);
  return { chips: visible, more };
}

function matchesFilter(order: OnlineOrder, filter: Filter, search: string): boolean {
  if (filter === 'urgent' && !(order.status === 'pending' && ageMs(order.placed_at) > URGENT_THRESHOLD_MS)) {
    return false;
  }
  if (filter === 'high_value' && order.total_minor < HIGH_VALUE_THRESHOLD) {
    return false;
  }
  if (filter === 'returning' && !order.customer_id) {
    return false;
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    const hay = [
      order.id,
      order.customer_name ?? '',
      order.customer_phone ?? '',
      order.delivery_address ?? '',
      ...(order.lines ?? []).map((l) => l.title),
    ]
      .join(' ')
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function OrderInboxScreen() {
  const navigate = useNavigate();
  const vendor_id = getVendorId();

  const [tab, setTab] = useState<Tab>('pending');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [soundOn, setSoundOn] = useState(true);

  const pending = useOrders((s) => s.pending);
  const picking = useOrders((s) => s.picking);
  const done = useOrders((s) => s.done);
  const loading = useOrders((s) => s.loading);
  const error = useOrders((s) => s.error);

  useEffect(() => {
    void useOrders.getState().fetchAll(vendor_id);
  }, [vendor_id]);

  const activeList = tab === 'pending' ? pending : tab === 'picking' ? picking : done;
  const filteredList = useMemo(
    () => activeList.filter((o) => matchesFilter(o, filter, search)),
    [activeList, filter, search],
  );

  function handleAccept(id: string) {
    void useOrders.getState().accept(vendor_id, id);
  }
  function handleReject(id: string) {
    void useOrders.getState().reject(vendor_id, id);
  }
  function handlePartial(id: string) {
    // For v1: open OrderDetail to pick OOS lines. Stub navigation.
    navigate(`/orders/${id}?mode=partial`);
  }
  function handleViewDetail(id: string) {
    navigate(`/orders/${id}`);
  }
  function handleHandoff(id: string) {
    navigate(`/orders/${id}?mode=handoff`);
  }
  function handleRefresh() {
    void useOrders.getState().fetchAll(vendor_id);
  }
  function handleBack() {
    navigate(-1);
  }

  const showDoneEmpty = tab === 'done' && !loading && filteredList.length === 0;
  const showGenericEmpty = tab !== 'done' && !loading && filteredList.length === 0 && !error;

  return (
    <div className="oi-root">
      <header className="oi-header">
        <button
          type="button"
          className="oi-back-chev"
          aria-label="Back"
          onClick={handleBack}
        >
          ←
        </button>
        <div>
          <div className="oi-title">Hanoot orders</div>
          <div className="oi-sub">Online orders from the customer app</div>
        </div>
        <div className="oi-spacer" />
        <button
          type="button"
          className="oi-h-action"
          onClick={() => setSoundOn((v) => !v)}
          aria-pressed={soundOn}
        >
          🔔 {soundOn ? 'Sound on' : 'Sound off'}
        </button>
        <button type="button" className="oi-h-action" onClick={handleRefresh}>
          ⟳ Refresh
        </button>
      </header>

      <nav className="oi-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pending'}
          className={`oi-tab ${tab === 'pending' ? 'active' : ''}`}
          onClick={() => setTab('pending')}
        >
          Pending <span className="oi-tab-pill">{pending.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'picking'}
          className={`oi-tab ${tab === 'picking' ? 'active' : ''}`}
          onClick={() => setTab('picking')}
        >
          Picking <span className="oi-tab-pill">{picking.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'done'}
          className={`oi-tab ${tab === 'done' ? 'active' : ''}`}
          onClick={() => setTab('done')}
        >
          Done <span className="oi-tab-pill">{done.length}</span>
        </button>
      </nav>

      <div className="oi-filter-bar">
        <span className="oi-label">Filter</span>
        <button
          type="button"
          className={`oi-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`oi-chip ${filter === 'urgent' ? 'active' : ''}`}
          onClick={() => setFilter('urgent')}
        >
          Urgent · &gt;5min
        </button>
        <button
          type="button"
          className={`oi-chip ${filter === 'high_value' ? 'active' : ''}`}
          onClick={() => setFilter('high_value')}
        >
          High value · &gt;25k
        </button>
        <button
          type="button"
          className={`oi-chip ${filter === 'returning' ? 'active' : ''}`}
          onClick={() => setFilter('returning')}
        >
          Customer · returning
        </button>
        <input
          className="oi-search-input"
          placeholder="Search orders, customer, item…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search orders"
        />
      </div>

      <div className="oi-list">
        {error ? <div className="oi-error">{error}</div> : null}
        {loading ? <div className="oi-loading">Loading orders…</div> : null}

        {!loading && filteredList.length > 0 ? (
          <div className="oi-list-divider">
            {tab === 'pending' ? 'Pending' : tab === 'picking' ? 'Picking' : 'Done today'} ·{' '}
            {filteredList.length} {filteredList.length === 1 ? 'order' : 'orders'}
          </div>
        ) : null}

        {filteredList.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            tab={tab}
            onAccept={handleAccept}
            onReject={handleReject}
            onPartial={handlePartial}
            onHandoff={handleHandoff}
            onViewDetail={handleViewDetail}
          />
        ))}

        {showDoneEmpty ? (
          <div className="oi-empty">
            <div className="oi-empty-ill" aria-hidden="true">
              ☕
            </div>
            <h3>All caught up · take a breath</h3>
            <p>
              {done.length === 0
                ? 'No orders delivered yet today. The next one will pop up here.'
                : `${done.length} orders delivered today. The next one will pop up here.`}
            </p>
          </div>
        ) : null}

        {showGenericEmpty ? (
          <div className="oi-empty">
            <div className="oi-empty-ill" aria-hidden="true">
              🛒
            </div>
            <h3>No {tab} orders</h3>
            <p>Orders will appear here as customers place them in the app.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type OrderCardProps = {
  order: OnlineOrder;
  tab: Tab;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onPartial: (id: string) => void;
  onHandoff: (id: string) => void;
  onViewDetail: (id: string) => void;
};

function OrderCard({
  order,
  tab,
  onAccept,
  onReject,
  onPartial,
  onHandoff,
  onViewDetail,
}: OrderCardProps) {
  const urgency = urgencyClass(order, tab);
  const { chips, more } = itemPreview(order);
  const timeAgo = formatTimeAgo(order.placed_at);

  let timeAgoClass = 'oi-time-ago';
  let timeAgoText = timeAgo;
  if (urgency === 'urgent') {
    timeAgoClass = 'oi-time-ago urgent-text';
    timeAgoText = `${timeAgo} · URGENT`;
  } else if (urgency === 'new') {
    timeAgoClass = 'oi-time-ago new-text';
    timeAgoText = `${timeAgo} · NEW`;
  } else if (urgency === 'picking') {
    const total = order.lines?.length ?? 0;
    const picked = (order.lines ?? []).filter((l) => l.picked).length;
    timeAgoClass = 'oi-time-ago picking-text';
    timeAgoText = `Picking · ${picked} / ${total} items`;
  }

  return (
    <article className={`oi-card ${urgency}`} data-order-id={order.id}>
      <div>
        <div className="oi-card-head">
          <span className="oi-order-id">{order.id}</span>
          <span className="oi-dot-sep" />
          <span className="oi-order-customer">{order.customer_name ?? 'Guest'}</span>
          <span className="oi-dot-sep" />
          <span className={timeAgoClass}>{timeAgoText}</span>
        </div>
        {chips.length > 0 ? (
          <div className="oi-items-preview">
            {chips.map((c, i) => (
              <span key={i} className="oi-item-chip">
                {c}
              </span>
            ))}
            {more > 0 ? <span className="oi-item-chip more">+{more} more</span> : null}
          </div>
        ) : null}
        <div className="oi-card-foot">
          <span className="oi-order-total">
            {formatMoney(order.total_minor, order.currency_code)}
          </span>
          {order.delivery_address ? (
            <span className="oi-order-meta">📍 {order.delivery_address}</span>
          ) : null}
          {order.customer_phone ? (
            <span className="oi-order-meta">📞 {order.customer_phone}</span>
          ) : null}
        </div>
      </div>
      <div className="oi-card-actions">
        {tab === 'pending' ? (
          <>
            <button
              type="button"
              className="oi-btn oi-btn-primary"
              onClick={() => onAccept(order.id)}
            >
              ✓ Accept
            </button>
            <button
              type="button"
              className="oi-btn oi-btn-secondary"
              onClick={() => onPartial(order.id)}
            >
              Partial
            </button>
            <button
              type="button"
              className="oi-btn oi-btn-danger"
              onClick={() => onReject(order.id)}
            >
              ✕ Reject
            </button>
          </>
        ) : null}
        {tab === 'picking' ? (
          <>
            <button
              type="button"
              className="oi-btn oi-btn-primary"
              onClick={() => onHandoff(order.id)}
            >
              Hand to rider
            </button>
            <button
              type="button"
              className="oi-btn oi-btn-ghost"
              onClick={() => onViewDetail(order.id)}
            >
              View detail →
            </button>
          </>
        ) : null}
        {tab === 'done' ? (
          <button
            type="button"
            className="oi-btn oi-btn-ghost"
            onClick={() => onViewDetail(order.id)}
          >
            View detail →
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default OrderInboxScreen;
