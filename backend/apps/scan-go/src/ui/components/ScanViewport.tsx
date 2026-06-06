import React, { useEffect, useRef } from 'react';

interface ScanViewportProps {
  onScan: (value: string) => void;
  /** When true, show error corners (out-of-stock state) */
  error?: boolean;
  /** Text shown in the viewport hint area */
  hint?: string;
}

export function ScanViewport({ onScan, error, hint }: ScanViewportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef('');

  // Keep the hidden input focused when clicking anywhere on the viewport
  function focusInput() {
    inputRef.current?.focus();
  }

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const val = bufferRef.current.trim();
      bufferRef.current = '';
      if (inputRef.current) inputRef.current.value = '';
      if (val) onScan(val);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    bufferRef.current = e.target.value;
  }

  const cornerColor = error ? 'var(--burgundy)' : 'var(--gold-2)';
  const reticleBorderColor = error ? 'var(--burgundy)' : 'rgba(255,255,255,.5)';
  const scanLineColor = error ? 'var(--burgundy)' : 'var(--gold-2)';

  return (
    <div
      onClick={focusInput}
      style={{
        margin: 14,
        height: 150,
        borderRadius: 'var(--radius-2xl)',
        background: 'repeating-linear-gradient(135deg,#241f1b,#241f1b 12px,#2c2620 12px,#2c2620 24px)',
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.05)',
        cursor: 'text',
      }}
    >
      {/* Invisible HID input — captures barcode scanner keystrokes */}
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 1,
          height: 1,
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
        aria-label="Barcode input"
      />

      {/* Corner markers */}
      <span style={{ position: 'absolute', top: 24, left: 38, width: 18, height: 18, borderTop: `3px solid ${cornerColor}`, borderLeft: `3px solid ${cornerColor}` }} />
      <span style={{ position: 'absolute', top: 24, right: 38, width: 18, height: 18, borderTop: `3px solid ${cornerColor}`, borderRight: `3px solid ${cornerColor}` }} />
      <span style={{ position: 'absolute', bottom: 30, left: 38, width: 18, height: 18, borderBottom: `3px solid ${cornerColor}`, borderLeft: `3px solid ${cornerColor}` }} />
      <span style={{ position: 'absolute', bottom: 30, right: 38, width: 18, height: 18, borderBottom: `3px solid ${cornerColor}`, borderRight: `3px solid ${cornerColor}` }} />

      {/* Reticle */}
      <div style={{
        width: '70%',
        height: 78,
        border: `2px solid ${reticleBorderColor}`,
        borderRadius: 10,
        position: 'relative',
      }}>
        {/* Scan line */}
        <div style={{
          position: 'absolute',
          left: 6,
          right: 6,
          top: '50%',
          height: 2,
          background: scanLineColor,
          boxShadow: `0 0 12px ${scanLineColor}`,
        }} />
      </div>

      {/* Hint */}
      <div style={{
        position: 'absolute',
        bottom: 9,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'rgba(255,255,255,.7)',
        font: '600 11px/1 var(--sans)',
      }}>
        {hint ?? 'Point at a barcode'}
      </div>
    </div>
  );
}
