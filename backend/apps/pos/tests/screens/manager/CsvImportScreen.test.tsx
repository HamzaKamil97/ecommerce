import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CsvImportScreen } from '../../../src/ui/screens/manager/CsvImportScreen';
import * as pos from '../../../src/api/pos';

vi.mock('../../../src/api/pos', () => ({
  importCsv: vi.fn(),
}));

// jsdom's File doesn't implement .text() — polyfill it so onFile can call f.text()
if (typeof File.prototype.text === 'undefined') {
  File.prototype.text = function () {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(this);
    });
  };
}

describe('CsvImportScreen', () => {
  it('renders idle state with dropzone copy', () => {
    render(<CsvImportScreen />);
    expect(screen.getByText(/drop your csv here/i)).toBeInTheDocument();
  });

  it('transitions to uploading state after a file is selected', async () => {
    vi.mocked(pos.importCsv).mockReturnValue(new Promise(() => {}));

    render(<CsvImportScreen />);

    const file = new File(['title,price\nA,100'], 'cat.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/csv file input/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/auto-categorizing/i)).toBeInTheDocument();
  });

  it('renders success state with imported count and error report when forceState="success"', () => {
    render(<CsvImportScreen forceState="success" />);
    // "Imported" appears in the stat label; use getAllByText since it may match multiple elements
    expect(screen.getAllByText(/imported/i).length).toBeGreaterThan(0);
    // "Errors" appears in the error report header h3
    expect(screen.getAllByText(/errors/i).length).toBeGreaterThan(0);
  });
});
