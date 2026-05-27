import { apiGet } from './client';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertRow = {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  type: string;
  created_at: string;
  read_at: string | null;
};

// NOTE: /pos/alerts backend route hasn't shipped yet. It will eventually
// aggregate wms drift events + notifications. Until then, fetchAlerts() catches
// the 404 and returns an empty list so the UI can be wired against a stable
// surface today and degrade gracefully.
export async function fetchAlerts(vendor_id: string): Promise<AlertRow[]> {
  try {
    const r = await apiGet<{ alerts?: AlertRow[] }>(
      `/pos/alerts?vendor_id=${encodeURIComponent(vendor_id)}`,
    );
    return r.alerts ?? [];
  } catch (e: any) {
    if (e?.status === 404 || e?.response?.status === 404) return [];
    throw e;
  }
}
