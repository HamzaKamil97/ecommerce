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

export async function listDepartments(tenantId: string): Promise<Department[]> {
  const r = await apiGet<any>(
    `/admin/departments?tenant_id=${encodeURIComponent(tenantId)}`,
  );
  return r.departments ?? r.rows ?? [];
}

export async function createDepartment(input: {
  tenant_id: string;
  name: string;
  handle: string;
  icon_url?: string | null;
}): Promise<Department> {
  return apiPost('/admin/departments', input);
}

export async function updateDepartment(
  id: string,
  patch: { name?: string; icon_url?: string | null },
): Promise<{ ok: boolean }> {
  return apiPatch(`/admin/departments/${id}`, patch);
}

export async function reorderDepartments(
  tenantId: string,
  order: { id: string; position: number }[],
): Promise<{ updated: number }> {
  return api('/admin/departments/reorder', {
    method: 'PUT',
    body: JSON.stringify({ tenant_id: tenantId, order }),
  });
}
