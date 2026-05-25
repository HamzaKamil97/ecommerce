type Options = {
  onScan: (code: string) => void;
  interKeyMs?: number;
  minLen?: number;
};

/**
 * Listens for keyboard input that matches the timing pattern of a USB HID
 * barcode scanner: characters arriving rapidly (< interKeyMs apart) terminated
 * by an Enter keypress. Skips events when an input/textarea is focused so we
 * never steal real typing.
 */
export function startBarcodeListener(opts: Options): () => void {
  const interKeyMs = opts.interKeyMs ?? 50;
  const minLen = opts.minLen ?? 4;

  let buffer = '';
  let lastT = 0;

  function isTypingTarget(): boolean {
    const ae = document.activeElement;
    if (!ae) return false;
    const tag = ae.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || (ae as HTMLElement).isContentEditable;
  }

  function onKey(e: KeyboardEvent) {
    if (isTypingTarget()) { buffer = ''; return; }
    const now = performance.now();
    const gap = now - lastT;
    lastT = now;

    if (e.key === 'Enter') {
      if (buffer.length >= minLen) opts.onScan(buffer);
      buffer = '';
      return;
    }
    if (e.key.length !== 1) return;
    if (gap > interKeyMs && buffer.length > 0) {
      buffer = e.key;
      return;
    }
    buffer += e.key;
  }

  document.addEventListener('keydown', onKey, true);
  return () => document.removeEventListener('keydown', onKey, true);
}
