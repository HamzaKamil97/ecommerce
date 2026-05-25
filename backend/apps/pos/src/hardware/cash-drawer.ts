import { sendBytes } from './printer-webserial';
import { ESCPOS_DRAWER_KICK } from './escpos';

/** Send the ESC/POS drawer-kick pulse to open the cash drawer. */
export async function openDrawer(): Promise<void> {
  await sendBytes(ESCPOS_DRAWER_KICK);
}
