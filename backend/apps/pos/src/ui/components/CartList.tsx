import { useCart } from '../../state/cart';
import './CartList.css';

export type CartListProps = {
  /** Phone layout: compact rows, no inline stepper. Default false (tablet/desktop). */
  compact?: boolean;
};

/** Short-format IQD for inline cart display (e.g. "13.5k", "1.2k", "750").
 *  The full thousands-separator format is reserved for the Charge button
 *  (single source of truth for the exact charge amount).
 */
function formatIQDShort(minor: number): string {
  if (minor < 1000) return `${minor}`;
  const k = minor / 1000;
  // Show 1 decimal unless it's a whole-k value
  return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
}

export function CartList({ compact = false }: CartListProps) {
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.removeLine);
  const reset = useCart((s) => s.reset);

  const count = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <div className={`cart-list${compact ? ' is-phone' : ''}`}>
      <div className="cart-list-header">
        <span className="title">Cart</span>
        {count > 0 && (
          <span className="count">{count} {count === 1 ? 'item' : 'items'}</span>
        )}
        <button
          type="button"
          className="clear"
          onClick={() => reset()}
          disabled={lines.length === 0}
        >
          Clear cart
        </button>
      </div>

      <div className="cart-rows">
        {lines.length === 0 && (
          <div className="cart-empty">No items yet — start by scanning</div>
        )}
        {lines.map((l, i) => {
          const lineTotal = l.qty * l.unit_price_minor;
          return (
            <div
              key={l.variant_id}
              className="cart-row"
              style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}
            >
              <div className="cart-thumb" aria-hidden="true">🛍</div>
              <div>
                <div className="cart-name">{l.name}</div>
                <small>{formatIQDShort(l.unit_price_minor)} ea.</small>
              </div>

              {compact ? (
                <div className="cart-right">
                  <div className="qty">× {l.qty}</div>
                  <div className="total">{formatIQDShort(lineTotal)}</div>
                </div>
              ) : (
                <>
                  <div className="qty-stepper">
                    <button
                      type="button"
                      className="qty-btn"
                      aria-label="decrease"
                      onClick={() => setQty(l.variant_id, l.qty - 1)}
                    >
                      −
                    </button>
                    <span className="qty-val">{l.qty}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      aria-label="increase"
                      onClick={() => setQty(l.variant_id, l.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="cart-line-total">{formatIQDShort(lineTotal)} IQD</div>
                  <button
                    type="button"
                    className="row-more"
                    aria-label="remove"
                    onClick={() => remove(l.variant_id)}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
