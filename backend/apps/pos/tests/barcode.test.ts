import { describe, it, expect, vi, afterEach } from 'vitest';
import { startBarcodeListener } from '../src/hardware/barcode';

function typeFast(code: string) {
  for (const ch of code) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ch }));
  }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
}

describe('barcode HID listener', () => {
  let stop: () => void;
  afterEach(() => { stop?.(); });

  it('emits onScan when characters arrive within 50ms inter-key window + Enter', () => {
    const onScan = vi.fn();
    stop = startBarcodeListener({ onScan, interKeyMs: 50, minLen: 4 });
    typeFast('8901234567890');
    expect(onScan).toHaveBeenCalledWith('8901234567890');
  });

  it('does NOT emit when user types slowly (human typing)', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const onScan = vi.fn();
    stop = startBarcodeListener({ onScan, interKeyMs: 50, minLen: 4 });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    await vi.advanceTimersByTimeAsync(200);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onScan).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('ignores keys when the active element is an input the user is typing into', () => {
    const onScan = vi.fn();
    stop = startBarcodeListener({ onScan, interKeyMs: 50, minLen: 4 });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    typeFast('1234');
    expect(onScan).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('drops sequences shorter than minLen', () => {
    const onScan = vi.fn();
    stop = startBarcodeListener({ onScan, interKeyMs: 50, minLen: 4 });
    typeFast('12'); // only 2 chars
    expect(onScan).not.toHaveBeenCalled();
  });

  it('starts a new buffer when a key arrives after a gap larger than interKeyMs', () => {
    vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const onScan = vi.fn();
    stop = startBarcodeListener({ onScan, interKeyMs: 50, minLen: 4 });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    // gap > 50ms → buffer resets
    vi.advanceTimersByTime(100);
    // now type fast — should be a fresh scan
    for (const ch of '2345') document.dispatchEvent(new KeyboardEvent('keydown', { key: ch }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onScan).toHaveBeenCalledWith('2345');
    vi.useRealTimers();
  });

  it('returns a stop() function that removes the listener', () => {
    const onScan = vi.fn();
    stop = startBarcodeListener({ onScan, interKeyMs: 50, minLen: 4 });
    stop();
    typeFast('12345');
    expect(onScan).not.toHaveBeenCalled();
  });
});
