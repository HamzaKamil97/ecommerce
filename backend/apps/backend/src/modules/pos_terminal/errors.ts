export class PosTerminalBadPinError extends Error {
  code = 'POS_TERMINAL_BAD_PIN';
  constructor(cashierId: string) { super(`Bad PIN for cashier ${cashierId}`); }
}
export class PosTerminalSaleConflictError extends Error {
  code = 'POS_TERMINAL_SALE_CONFLICT';
  constructor(public clientId: string) { super(`Sale with client_id ${clientId} already recorded`); }
}
