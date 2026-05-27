import { useEffect } from 'react';
import { startBarcodeListener } from '../../hardware/barcode';
import './ScanZone.css';

export type ScanZoneProps = {
  active?: boolean;
  hint?: string;
  subHint?: string;
  onCode?: (code: string) => void;
  className?: string;
};

export function ScanZone({
  active = true,
  hint = 'Scan or tap an item',
  subHint,
  onCode,
  className,
}: ScanZoneProps) {
  useEffect(() => {
    if (!onCode) return undefined;
    const stop = startBarcodeListener({ onScan: (code) => onCode(code) });
    return () => stop();
  }, [onCode]);

  return (
    <div className={`scan-zone ${active ? 'scan-zone-active' : 'scan-zone-idle'} ${className ?? ''}`}>
      <div className="scan-zone-dot" aria-hidden="true" />
      <div className="scan-zone-text">
        {hint}
        {subHint ? <small>{subHint}</small> : null}
      </div>
    </div>
  );
}
