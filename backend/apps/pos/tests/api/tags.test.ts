import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import { listTags, createTag, updateTag } from '../../src/api/tags';

vi.mock('../../src/api/client', () => ({
  api: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

const mockTag = {
  id: 't1',
  vendor_id: 'v_test',
  name: 'Halal',
  slug: 'halal',
  featured: false,
  position: 0,
};

beforeEach(() => vi.clearAllMocks());

describe('tags api client', () => {
  it('listTags calls apiGet with correct route and unwraps {tags} array', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ tags: [mockTag] });
    const out = await listTags('v_test');
    expect(client.apiGet).toHaveBeenCalledWith('/admin/tags?vendor_id=v_test');
    expect(out).toEqual([mockTag]);
  });

  it('listTags returns [] when tags array is empty', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ tags: [] });
    const out = await listTags('v_test');
    expect(out).toEqual([]);
  });

  it('createTag calls apiPost with /admin/tags and unwraps {tag} -> Tag', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ tag: mockTag });
    const out = await createTag({ vendor_id: 'v_test', name: 'Halal' });
    expect(client.apiPost).toHaveBeenCalledWith('/admin/tags', { vendor_id: 'v_test', name: 'Halal' });
    expect(out).toEqual(mockTag);
  });

  it('updateTag calls apiPatch with /admin/tags/:id and unwraps {tag} -> Tag', async () => {
    const updated = { ...mockTag, featured: true };
    vi.mocked(client.apiPatch).mockResolvedValue({ tag: updated });
    const out = await updateTag('t1', { featured: true });
    expect(client.apiPatch).toHaveBeenCalledWith('/admin/tags/t1', { featured: true });
    expect(out).toEqual(updated);
    expect(out.featured).toBe(true);
  });

  it('updateTag with featured:false (un-feature path) persists false', async () => {
    const unfeatured = { ...mockTag, featured: false };
    vi.mocked(client.apiPatch).mockResolvedValue({ tag: unfeatured });
    const out = await updateTag('t1', { featured: false });
    expect(client.apiPatch).toHaveBeenCalledWith('/admin/tags/t1', { featured: false });
    expect(out.featured).toBe(false);
  });
});
