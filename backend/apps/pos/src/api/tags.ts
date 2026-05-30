import { apiGet, apiPost, apiPatch } from './client';

export type Tag = {
  id: string;
  vendor_id: string;
  name: string;
  featured: boolean;
  position: number;
  product_count?: number;
};

export type AiTagSuggestion = {
  id: string;
  name: string;
  coverage_pct: number;
  rationale: string;
};

export type CreateTagInput = {
  vendor_id: string;
  name: string;
  featured?: boolean;
};

export type UpdateTagInput = {
  name?: string;
  featured?: boolean;
};

export async function listTags(vendorId: string): Promise<Tag[]> {
  const r = await apiGet<any>(`/admin/tags?vendor_id=${encodeURIComponent(vendorId)}`);
  return r.tags ?? r.rows ?? [];
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  const r = await apiPost<{ tag: Tag }>('/admin/tags', input);
  return r.tag;
}

export async function updateTag(id: string, patch: UpdateTagInput): Promise<Tag> {
  const r = await apiPatch<{ tag: Tag }>(`/admin/tags/${id}`, patch);
  return r.tag;
}

export async function listAiSuggestions(vendorId: string): Promise<AiTagSuggestion[]> {
  return apiGet<any>(`/admin/tags/ai-suggestions?vendor_id=${encodeURIComponent(vendorId)}`)
    .then((r) => r.suggestions ?? [])
    .catch(() => []); // FAIL-SOFT: return empty array if route 404s or errors
}
