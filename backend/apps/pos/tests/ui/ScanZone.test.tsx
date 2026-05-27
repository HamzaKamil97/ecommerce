import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScanZone } from '../../src/ui/components/ScanZone';

vi.mock('../../src/hardware/barcode', () => ({
  startBarcodeListener: ({ onScan }: any) => {
    (window as any).__scan = onScan;
    return () => { delete (window as any).__scan; };
  },
}));

describe('ScanZone', () => {
  it('renders default hint when no prop', () => {
    render(<ScanZone />);
    expect(screen.getByText(/Scan or tap/i)).toBeInTheDocument();
  });

  it('uses custom hint', () => {
    render(<ScanZone hint="Custom hint" />);
    expect(screen.getByText('Custom hint')).toBeInTheDocument();
  });

  it('shows subHint when provided', () => {
    render(<ScanZone hint="A" subHint="More info" />);
    expect(screen.getByText('More info')).toBeInTheDocument();
  });

  it('attaches barcode listener when onCode provided', async () => {
    const onCode = vi.fn();
    render(<ScanZone onCode={onCode} />);
    await (window as any).__scan('111');
    expect(onCode).toHaveBeenCalledWith('111');
  });
});
