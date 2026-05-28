import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiSuggestionBanner } from '../../src/ui/components/AiSuggestionBanner';

describe('AiSuggestionBanner', () => {
  it('renders title + body + accept/dismiss actions', () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();
    render(
      <AiSuggestionBanner
        title="Add halal tag?"
        body="82% of grocery would qualify"
        onAccept={onAccept}
        onDismiss={onDismiss}
        acceptLabel="+ Add tag"
      />,
    );
    expect(screen.getByText('Add halal tag?')).toBeTruthy();
    expect(screen.getByText(/82% of grocery/)).toBeTruthy();
    fireEvent.click(screen.getByText('+ Add tag'));
    expect(onAccept).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/dismiss|not now/i));
    expect(onDismiss).toHaveBeenCalled();
  });
});
