import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DenominationGrid } from '../../src/ui/components/DenominationGrid';

describe('DenominationGrid', () => {
  it('renders 6 IQD denominations', () => {
    render(<DenominationGrid value={{}} onChange={() => {}} />);
    // Anchor each regex so "25,000" doesn't satisfy /5,?000/ via substring.
    // (Spec test used unanchored regexes which are ambiguous — anchored matches
    // express the intent: each label appears exactly once.)
    expect(screen.getByText(/^50,?000$/)).toBeInTheDocument();
    expect(screen.getByText(/^25,?000$/)).toBeInTheDocument();
    expect(screen.getByText(/^10,?000$/)).toBeInTheDocument();
    expect(screen.getByText(/^5,?000$/)).toBeInTheDocument();
    expect(screen.getByText(/^1,?000$/)).toBeInTheDocument();
    expect(screen.getByText(/^250$/)).toBeInTheDocument();
  });

  it('computes total from values', () => {
    render(<DenominationGrid value={{ '50000': 3, '10000': 3, '5000': 1, '1000': 1, '250': 3 }} onChange={() => {}} />);
    // 150,000 + 30,000 + 5,000 + 1,000 + 750 = 186,750
    expect(screen.getByText(/186,?750/)).toBeInTheDocument();
  });

  it('onChange fires when an input changes', () => {
    const onChange = vi.fn();
    render(<DenominationGrid value={{}} onChange={onChange} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0]!, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith('50000', 5);
  });
});
