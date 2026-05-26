import '@testing-library/jest-dom/vitest';

// jsdom does not implement ResizeObserver; recharts' ResponsiveContainer requires it
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
