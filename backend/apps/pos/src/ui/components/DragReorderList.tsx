import { useState, ReactNode } from 'react';
import './DragReorderList.css';

export type DragItem = { id: string; content: ReactNode };

type Props = {
  items: DragItem[];
  onReorder: (newOrderIds: string[]) => void;
};

export function DragReorderList({ items, onReorder }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setOverId(null);
      return;
    }
    const order = items.map((i) => i.id);
    const from = order.indexOf(draggingId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDraggingId(null);
      setOverId(null);
      return;
    }
    order.splice(to, 0, ...order.splice(from, 1));
    onReorder(order);
    setDraggingId(null);
    setOverId(null);
  }

  return (
    <ul className="drag-reorder-list">
      {items.map((it) => (
        <li
          key={it.id}
          role="listitem"
          draggable
          className={`dr-row${draggingId === it.id ? ' dragging' : ''}${overId === it.id ? ' over' : ''}`}
          onDragStart={() => setDraggingId(it.id)}
          onDragEnter={() => setOverId(it.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(it.id)}
          onDragEnd={() => { setDraggingId(null); setOverId(null); }}
        >
          <span className="grip" aria-label="Drag handle">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </span>
          <div className="dr-content">{it.content}</div>
        </li>
      ))}
    </ul>
  );
}
