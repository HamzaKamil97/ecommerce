import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';

// jsdom in this vitest version ships an incomplete localStorage (missing
// .clear / sometimes .setItem). Provide a deterministic in-memory polyfill
// so Zustand's persist middleware can write without throwing in tests.
function installMemoryStorage(target: 'localStorage' | 'sessionStorage') {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => { store.delete(k); },
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
  };
  Object.defineProperty(globalThis, target, {
    configurable: true,
    value: storage,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, target, {
      configurable: true,
      value: storage,
    });
  }
}

installMemoryStorage('localStorage');
installMemoryStorage('sessionStorage');

// Cross-test leakage guard: persisted Zustand stores rehydrate from storage on
// import, so a sign-in in one test can bleed into another. Clearing both storages
// after each test ensures every test starts from a clean slate.
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
