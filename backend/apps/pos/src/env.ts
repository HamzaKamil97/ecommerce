export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:9000';
export const VENDOR_ID = import.meta.env.VITE_VENDOR_ID ?? '';
export const TERMINAL_ID = import.meta.env.VITE_TERMINAL_ID ?? `term_${crypto.randomUUID().slice(0, 8)}`;
