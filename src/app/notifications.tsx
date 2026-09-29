import { router, Stack } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Card, EmptyState, ErrorState, SkeletonList, Text, useScreenStyles } from '@/components';
import { NotificationRow } from '@/features/notifications/components';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/features/notifications/hooks';
import { notificationHref } from '@/features/notifications/push';
import { useAuth } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useHotel } from '@/lib/hotel';
import { errorText } from '@/lib/http';
import { usePullToRefresh, useRefreshOnFocus } from '@/lib/query';
import type { AppNotification } from '@/lib/types';
import { space, useTheme } from '@/theme';

export default function NotificationsScreen() {
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const { isStaff, canManage } = useAuth();
  const { selectHotel } = useHotel();
  const list = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const pull = usePullToRefresh(list.refetch);
  useRefreshOnFocus(list.refetch);

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const unread = list.data?.pages[0]?.unreadCount ?? 0;

  const open = (n: AppNotification) => {
    haptics.tap();
    if (!n.isRead) markRead.mutate(n.id);
    if (isStaff && n.hotelId) selectHotel(n.hotelId);
    const href = notificationHref({ reservationId: n.reservationId, taskId: n.housekeepingTaskId }, canManage);
    if (href !== '/notifications') router.push(href);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            unread > 0 ? (
              <Pressable
                onPress={() => {
                  haptics.selection();
                  markAllRead.mutate();
                }}
                disabled={markAllRead.isPending}
                accessibilityRole="button"
                hitSlop={8}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text variant="callout" color="primary" weight="600">
                  Mark all read
                </Text>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        style={screen.screen}
        contentContainerStyle={screen.content}
        data={items.length > 0 ? [items] : []}
        keyExtractor={() => 'list'}
        refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        // One card holds the rows, like the other grouped lists in the app
        renderItem={({ item: rows }) => (
          <Card padded={false}>
            {rows.map((n, index) => (
              <NotificationRow key={n.id} notification={n} first={index === 0} onPress={() => open(n)} />
            ))}
          </Card>
        )}
        ListEmptyComponent={
          list.isPending ? (
            <SkeletonList header={false} count={4} />
          ) : list.error ? (
            <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />
          ) : (
            <EmptyState
              icon={{ ios: 'bell', android: 'notifications' }}
              title="Nothing new"
              message={
                canManage
                  ? 'New online bookings and guest cancellations show up here.'
                  : isStaff
                    ? 'Tasks assigned to you show up here.'
                    : 'Updates about your bookings show up here.'
              }
              action={{ title: 'Notification settings', onPress: () => router.push('/notification-settings') }}
            />
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: space.lg }} />
          ) : items.length > 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: space.md }}>
              <Pressable onPress={() => router.push('/notification-settings')} accessibilityRole="button" hitSlop={8}>
                <Text variant="callout" color="primary">
                  Notification settings
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </>
  );
}
