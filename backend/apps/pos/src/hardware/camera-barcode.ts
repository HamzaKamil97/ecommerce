import { BrowserMultiFormatReader } from '@zxing/browser';

export function isPlausibleBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code);
}

export type CameraScanHandle = { stop: () => void };

/**
 * Start the rear camera and continuously decode barcodes into onScan().
 * Caller is responsible for mounting the <video> element passed in.
 * Returns a handle whose stop() releases the camera and stops decoding.
 */
export async function startCameraScan(opts: {
  videoEl: HTMLVideoElement;
  onScan: (code: string) => void;
  onError?: (e: Error) => void;
}): Promise<CameraScanHandle> {
  const reader = new BrowserMultiFormatReader();
  try {
    const controls = await reader.decodeFromVideoDevice(
      undefined,
      opts.videoEl,
      (result) => {
        if (result) {
          const txt = result.getText();
          if (isPlausibleBarcode(txt)) opts.onScan(txt);
        }
      },
    );
    return { stop: () => controls.stop() };
  } catch (e: any) {
    opts.onError?.(e);
    return { stop: () => {} };
  }
}
