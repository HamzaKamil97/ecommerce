import { useEffect, useMemo, useState } from 'react';
import './Spotlight.css';

export type SpotlightItem = {
  id: string;
  label: string;
  meta?: string;
  shortcut?: string;
  iconChar?: string;
};

export type SpotlightGroup = { group: string; items: SpotlightItem[] };

type Props = {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onSelect: (item: SpotlightItem) => void;
  results: SpotlightGroup[];
};

export function Spotlight({ open, query, onQueryChange, onClose, onSelect, results }: Props) {
  const flat = useMemo(() => results.flatMap((g) => g.items), [results]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { setActiveIndex(0); }, [results]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = flat[activeIndex];
        if (item) onSelect(item);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, flat, activeIndex, onSelect, onClose]);

  if (!open) return null;

  let runningIndex = -1;
  return (
    <div
      className="spotlight-overlay"
      role="dialog"
      aria-label="Spotlight search"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="spotlight-card">
        <div className="spotlight-input">
          <span className="ic" aria-hidden>🔍</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search products, departments, settings, actions…"
            aria-label="Spotlight query"
          />
          <span className="esc">Esc</span>
        </div>
        <div className="spotlight-results">
          {results.map((g) => (
            <div className="sr-group" key={g.group}>
              <div className="sr-label">{g.group}</div>
              {g.items.map((item) => {
                runningIndex += 1;
                const isActive = runningIndex === activeIndex;
                return (
                  <div
                    key={item.id}
                    className={`sr-row${isActive ? ' kbd-active' : ''}`}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => onSelect(item)}
                  >
                    <div className="ic-tile" aria-hidden>{item.iconChar ?? '•'}</div>
                    <div className="sr-body">
                      <div className="name">{item.label}</div>
                      {item.meta && <div className="meta">{item.meta}</div>}
                    </div>
                    {item.shortcut && <span className="kbd-hint">{item.shortcut}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="spotlight-foot">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
