declare module 'virtual:pwa-register' {
  export type RegisterSWOptions = {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (sw: ServiceWorkerRegistration | undefined) => void;
  };
  export function registerSW(opts?: RegisterSWOptions): (reload?: boolean) => Promise<void>;
}
