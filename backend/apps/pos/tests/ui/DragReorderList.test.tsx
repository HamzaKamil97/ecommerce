import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DragReorderList } from '../../src/ui/components/DragReorderList';

describe('DragReorderList', () => {
  it('renders items by current order', () => {
    render(
      <DragReorderList
        items={[
          { id: 'a', content: <span>A</span> },
          { id: 'b', content: <span>B</span> },
        ]}
        onReorder={() => {}}
      />,
    );
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]?.textContent).toContain('A');
    expect(rows[1]?.textContent).toContain('B');
  });

  it('calls onReorder when a drop completes', () => {
    const onReorder = vi.fn();
    render(
      <DragReorderList
        items={[
          { id: 'a', content: <span>A</span> },
          { id: 'b', content: <span>B</span> },
        ]}
        onReorder={onReorder}
      />,
    );
    const rows = screen.getAllByRole('listitem');
    const first = rows[0]!;
    const second = rows[1]!;
    fireEvent.dragStart(first);
    fireEvent.dragEnter(second);
    fireEvent.dragOver(second);
    fireEvent.drop(second);
    expect(onReorder).toHaveBeenCalledWith(['b', 'a']);
  });
});
