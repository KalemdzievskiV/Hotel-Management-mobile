import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { NotificationPage, NotificationPreference } from '@/lib/types';
import { notificationsApi } from './api';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

/** After a push arrives or something was read: the list and the badge reload */
export function invalidateNotifications(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
  void queryClient.invalidateQueries({ queryKey: notificationKeys.unread });
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last: NotificationPage) => (last.hasMore ? last.page + 1 : undefined),
  });
}

/** For the bell's badge. Pushes and the app coming to the foreground keep it current. */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async () => (await notificationsApi.unreadCount()).count,
    enabled,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useNotificationPreferences() {
  return useQuery({ queryKey: notificationKeys.preferences, queryFn: notificationsApi.preferences });
}

/** Flips one type straight away on screen; puts it back if the server says no */
export function useUpdatePreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: NotificationPreference) => notificationsApi.updatePreferences([change]),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.preferences });
      const previous = queryClient.getQueryData<NotificationPreference[]>(notificationKeys.preferences);
      queryClient.setQueryData<NotificationPreference[]>(notificationKeys.preferences, (list) =>
        list?.map((p) => (p.type === change.type ? change : p))
      );
      return { previous };
    },
    onError: (_error, _change, context) => queryClient.setQueryData(notificationKeys.preferences, context?.previous),
    onSuccess: (list) => queryClient.setQueryData(notificationKeys.preferences, list),
  });
}
