import { medusaClient } from './medusaClient';

export interface Notification {
  id: string;
  template: string;
  title: string;
  body: string;
  data: any;
  read_at: string | null;
  delivered_at: string | null;
  delivery_status: string;
  created_at: string;
}

export async function listNotifications(userId: string): Promise<{ notifications: Notification[]; unread: number }> {
  const { data } = await medusaClient.get('/store/notifications', { params: { user_id: userId } });
  return { notifications: data?.notifications ?? [], unread: data?.unread ?? 0 };
}

export async function markRead(notificationId: string) {
  const { data } = await medusaClient.post(`/store/notifications/${notificationId}/read`);
  return data;
}

export async function registerPushToken(userId: string, token: string, platform: 'expo' | 'ios' | 'android' = 'expo') {
  const { data } = await medusaClient.post('/store/notifications/push-token', {
    user_id: userId,
    token,
    platform,
  });
  return data;
}
