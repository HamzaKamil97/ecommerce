import { describe, it, expect } from 'vitest';
import { isPlausibleBarcode } from '../src/hardware/camera-barcode';

describe('isPlausibleBarcode', () => {
  it('accepts 12-14 digit barcodes', () => {
    expect(isPlausibleBarcode('012345678905')).toBe(true);
    expect(isPlausibleBarcode('5740900401099')).toBe(true);
    expect(isPlausibleBarcode('12345678901234')).toBe(true);
  });
  it('rejects too-short / non-numeric', () => {
    expect(isPlausibleBarcode('123')).toBe(false);
    expect(isPlausibleBarcode('abc12345')).toBe(false);
    expect(isPlausibleBarcode('')).toBe(false);
  });
});
