import { describe, it, expect } from '@jest/globals';
import AiService from '../service';

describe('AiService.classifyProductCategory (key-optional)', () => {
  it('returns "other" with 0 confidence when no OPENAI_API_KEY is set', async () => {
    delete process.env.OPENAI_API_KEY;
    const svc = new AiService({} as any, {} as any);
    const r = await svc.classifyProductCategory('Anything', undefined,
      ['grocery', 'clothes', 'pharmacy', 'salon', 'restaurant', 'other']);
    expect(r.category_handle).toBe('other');
    expect(r.confidence).toBe(0);
  });

  it('throws when allowed list is empty', async () => {
    delete process.env.OPENAI_API_KEY;
    const svc = new AiService({} as any, {} as any);
    await expect(svc.classifyProductCategory('x', undefined, []))
      .rejects.toThrow();
  });
});
