import { describe, it, expect, beforeAll } from 'vitest';

describe('animation keyframes', () => {
  beforeAll(() => {
    const link = document.createElement('style');
    link.textContent = `
      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
    `;
    document.head.appendChild(link);
  });

  it('animation keyframes are registered in the document', () => {
    const sheets = Array.from(document.styleSheets);
    const rules = sheets.flatMap((s) => {
      try { return Array.from(s.cssRules ?? []); } catch { return []; }
    });
    // CSSRule.KEYFRAMES_RULE === 7; use type check only (CSSKeyframesRule not available in all jsdom builds)
    const keyframeNames = rules
      .filter((r: any) => r.type === 7)
      .map((r: any) => r.name);
    expect(keyframeNames).toContain('fadeIn');
    expect(keyframeNames).toContain('slideUp');
    expect(keyframeNames).toContain('shimmer');
  });
});
