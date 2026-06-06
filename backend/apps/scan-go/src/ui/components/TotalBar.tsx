import React from 'react';

interface TotalBarProps {
  subtotal_minor: number;
  item_count: number;
}

function formatIQD(minor: number): string {
  return minor.toLocaleString('en-IQ') + ' IQD';
}

function toArabicNumerals(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d, 10)] ?? d);
}

export function TotalBar({ subtotal_minor, item_count }: TotalBarProps) {
  const arabicAmt = toArabicNumerals(subtotal_minor) + ' د.ع';
  const arabicTotal = 'المجموع ' + arabicAmt;

  return (
    <div style={{
      flexShrink: 0,
      background: 'linear-gradient(135deg,var(--emerald),var(--emerald-2))',
      color: '#fff',
      padding: '13px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        <div style={{
          font: '700 10px/1 var(--mono)',
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          opacity: 0.85,
        }}>Cart total</div>
        <div style={{
          font: '800 24px/1 var(--mono)',
          letterSpacing: '-.02em',
          marginTop: 5,
        }}>{formatIQD(subtotal_minor)}</div>
        <div style={{
          fontFamily: 'Noto Sans Arabic, var(--sans)',
          fontSize: 11,
          opacity: 0.8,
          marginTop: 3,
        }}>{arabicTotal}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ font: '800 20px/1 var(--mono)' }}>{item_count}</div>
        <div style={{
          font: '600 10px/1 var(--mono)',
          opacity: 0.85,
          marginTop: 4,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}>items</div>
      </div>
    </div>
  );
}
