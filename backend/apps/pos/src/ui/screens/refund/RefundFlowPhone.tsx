import { useState } from 'react';
import { RefundStep1Pick } from './RefundStep1Pick';
import { RefundStep2Items } from './RefundStep2Items';
import { RefundStep3Confirm } from './RefundStep3Confirm';
import { useRefundState } from './useRefundState';
import { useSession } from '../../../state/session';
import { VENDOR_ID as ENV_VENDOR_ID, TERMINAL_ID } from '../../../env';

type Step = 1 | 2 | 3;

type Props = { onClose: () => void };

export function RefundFlowPhone({ onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const cashier_id = useSession((s) => s.cashier_id) ?? 'dev_cashier';
  const refund = useRefundState({
    vendor_id: ENV_VENDOR_ID || 'v_test',
    cashier_id,
    terminal_id: TERMINAL_ID,
  });

  if (step === 1) {
    return <RefundStep1Pick refund={refund} onPicked={() => setStep(2)} onClose={onClose} />;
  }
  if (step === 2) {
    return <RefundStep2Items refund={refund} onBack={() => setStep(1)} onNext={() => setStep(3)} />;
  }
  return <RefundStep3Confirm refund={refund} onBack={() => setStep(2)} onClose={onClose} />;
}
