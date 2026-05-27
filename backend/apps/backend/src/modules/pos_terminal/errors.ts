export class PosTerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PosTerminalError';
  }
}

export class PosTerminalBadPinError extends PosTerminalError {
  code = 'POS_TERMINAL_BAD_PIN';
  constructor(cashierId: string) {
    super(`Bad PIN for cashier ${cashierId}`);
    this.name = 'PosTerminalBadPinError';
  }
}

export class PosTerminalSaleConflictError extends PosTerminalError {
  code = 'POS_TERMINAL_SALE_CONFLICT';
  constructor(public clientId: string) {
    super(`Sale with client_id ${clientId} already recorded`);
    this.name = 'PosTerminalSaleConflictError';
  }
}

export class InvalidRefundError extends PosTerminalError {
  code = 'INVALID_REFUND';
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidRefundError';
  }
}
