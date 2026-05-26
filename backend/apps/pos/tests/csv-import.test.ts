import { describe, it, expect } from 'vitest';
import { previewCsv } from '../src/ui/screens/manager/CsvImportScreen';

describe('previewCsv', () => {
  it('parses headers + first N rows', () => {
    const csv = 'a,b\n1,2\n3,4\n5,6\n';
    const r = previewCsv(csv, 2);
    expect(r.headers).toEqual(['a', 'b']);
    expect(r.rows.length).toBe(2);
    expect(r.rows[0]).toEqual({ a: '1', b: '2' });
    expect(r.totalRowCount).toBe(3);
  });
});
