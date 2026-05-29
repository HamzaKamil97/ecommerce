import { api, apiGet, apiPost, apiPatch } from './client';

export type Department = {
  id: string;
  tenant_id: string;
  handle: string;
  name: string;
  position: number;
  icon_url?: string | null;
  product_count?: number;
};

// Backend merch_category row shape (backend merch module). No product_count.
type MerchCategory = {
  id: string;
  tenant_id: string;
  handle: string;
  name: string;
  position: number;
  icon_url?: string | null;
};

function toDepartment(mc: MerchCategory): Department {
  return {
    id: mc.id,
    tenant_id: mc.tenant_id,
    handle: mc.handle,
    name: mc.name,
    position: mc.position,
    icon_url: mc.icon_url ?? null,
    // product_count intentionally omitted — the merch route does not return it.
  };
}

export async function listDepartments(tenantId: string): Promise<Department[]> {
  const r = await apiGet<{ merch_categories?: MerchCategory[] }>(
    `/admin/tenants/${encodeURIComponent(tenantId)}/merch-categories`,
  );
  return (r.merch_categories ?? []).map(toDepartment);
}

export async function createDepartment(input: {
  tenant_id: string;
  name: string;
  handle: string;
  icon_url?: string | null;
}): Promise<Department> {
  const r = await apiPost<{ merch_category: MerchCategory }>(
    `/admin/tenants/${encodeURIComponent(input.tenant_id)}/merch-categories`,
    { name: input.name, handle: input.handle, icon_url: input.icon_url },
  );
  return toDepartment(r.merch_category);
}

export async function updateDepartment(
  tenantId: string,
  id: string,
  patch: { name?: string; icon_url?: string | null; position?: number },
): Promise<Department> {
  const r = await apiPatch<{ merch_category: MerchCategory }>(
    `/admin/tenants/${encodeURIComponent(tenantId)}/merch-categories/${encodeURIComponent(id)}`,
    patch,
  );
  return toDepartment(r.merch_category);
}

// Reorder still targets the dedicated H-3.2c A4 route, which updates merch_category rows.
export async function reorderDepartments(
  tenantId: string,
  order: { id: string; position: number }[],
): Promise<{ updated: number }> {
  return api('/admin/departments/reorder', {
    method: 'PUT',
    body: JSON.stringify({ tenant_id: tenantId, order }),
  });
}
