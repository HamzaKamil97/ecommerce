import { useState } from 'react';
import { processRefund, type RefundLine, type RefundReason, type RefundResult } from '../../../api/refunds';
import type { Sale } from '../../../api/sales';

type SelectedLine = {
  line_id: string;
  qty: number;
  reason: RefundReason | null;
};

export type RefundState = ReturnType<typeof useRefundState>;

export function useRefundState(opts: { vendor_id: string; cashier_id: string; terminal_id: string }) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [selected, setSelected] = useState<SelectedLine[]>([]);
  const [method, setMethod] = useState<'cash' | 'store_credit'>('cash');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<RefundResult | null>(null);

  const refundTotalMinor = selected.reduce((sum, s) => {
    const line = sale?.lines.find((l) => l.id === s.line_id);
    return sum + (line ? s.qty * line.unit_price_minor : 0);
  }, 0);

  const allReasonsPicked = selected.length > 0 && selected.every((s) => !!s.reason);
  const readyToSubmit = allReasonsPicked && pin.length === 4 && !submitting;

  function toggleLine(line_id: string) {
    setSelected((prev) => {
      const existing = prev.find((s) => s.line_id === line_id);
      if (existing) return prev.filter((s) => s.line_id !== line_id);
      const line = sale?.lines.find((l) => l.id === line_id);
      return [...prev, { line_id, qty: line?.qty ?? 1, reason: null }];
    });
  }

  function setReason(line_id: string, reason: RefundReason) {
    setSelected((prev) => prev.map((s) => (s.line_id === line_id ? { ...s, reason } : s)));
  }

  function setQty(line_id: string, qty: number) {
    setSelected((prev) => prev.map((s) => (s.line_id === line_id ? { ...s, qty } : s)));
  }

  function appendPin(digit: string) {
    setPin((prev) => (prev.length >= 4 ? prev : prev + digit));
  }

  function backspacePin() {
    setPin((prev) => prev.slice(0, -1));
  }

  function reset() {
    setSale(null);
    setSelected([]);
    setMethod('cash');
    setPin('');
    setError(null);
    setSuccess(null);
  }

  async function submit(args: { manager_id: string }) {
    if (!sale) {
      setError('No sale selected');
      return;
    }
    if (selected.length === 0) {
      setError('Pick at least one line');
      return;
    }
    if (selected.some((s) => !s.reason)) {
      setError('Each line needs a reason');
      return;
    }
    if (pin.length !== 4) {
      setError('Manager PIN required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const lines: RefundLine[] = selected.map((s) => {
        const line = sale.lines.find((l) => l.id === s.line_id)!;
        return {
          original_sale_line_id: s.line_id,
          variant_id: line.variant_id,
          qty: s.qty,
          unit_price_minor: line.unit_price_minor,
          reason: s.reason!,
        };
      });
      const result = await processRefund({
        vendor_id: opts.vendor_id,
        cashier_id: opts.cashier_id,
        manager_id: args.manager_id,
        manager_pin: pin,
        terminal_id: opts.terminal_id,
        original_sale_id: sale.id,
        lines,
        method,
        client_id: `rfd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
      setSuccess(result);
    } catch (e: unknown) {
      const err = e as { payload?: { error?: string }; message?: string };
      setError(err?.payload?.error ?? err?.message ?? 'Refund failed');
    } finally {
      setSubmitting(false);
    }
  }

  return {
    sale,
    setSale,
    selected,
    toggleLine,
    setReason,
    setQty,
    method,
    setMethod,
    pin,
    setPin,
    appendPin,
    backspacePin,
    refundTotalMinor,
    allReasonsPicked,
    readyToSubmit,
    submit,
    submitting,
    error,
    success,
    setError,
    reset,
  };
}
