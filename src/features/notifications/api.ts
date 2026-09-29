import { request } from '@/lib/http';
import type { NotificationPage, NotificationPreference } from '@/lib/types';

export const notificationsApi = {
  /** Newest first */
  list: (page: number, pageSize = 20) =>
    request<NotificationPage>('GET', `/Notifications?page=${page}&pageSize=${pageSize}`),
  unreadCount: () => request<{ count: number }>('GET', '/Notifications/unread-count'),
  markRead: (id: number) => request<void>('POST', `/Notifications/${id}/read`),
  markAllRead: () => request<void>('POST', '/Notifications/read-all'),

  /** Sent on every start while signed in, so the server always has this phone's current token */
  registerDevice: (token: string, platform: 'android' | 'ios') =>
    request<void>('POST', '/Notifications/devices', { token, platform }),
  /** On sign-out: this phone stops getting the user's pushes */
  unregisterDevice: (token: string) => request<void>('DELETE', '/Notifications/devices', { token }),

  /** The types that apply to the user's role, and whether each one pushes */
  preferences: () => request<NotificationPreference[]>('GET', '/Notifications/preferences'),
  updatePreferences: (changes: NotificationPreference[]) =>
    request<NotificationPreference[]>('PUT', '/Notifications/preferences', changes),
};
