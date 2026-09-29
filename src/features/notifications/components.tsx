import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon, Text } from '@/components';
import type { AndroidSymbol, IosSymbol } from '@/components/Icon';
import { formatServerTime } from '@/lib/format';
import { AppNotification, NotificationType } from '@/lib/types';
import { radius, space, useTheme, type ToneName } from '@/theme';
import { useUnreadCount } from './hooks';

const TYPE_STYLE: Record<NotificationType, { icon: { ios: IosSymbol; android: AndroidSymbol }; tone: ToneName }> = {
  [NotificationType.NewBooking]: { icon: { ios: 'calendar.badge.plus', android: 'event' }, tone: 'primary' },
  [NotificationType.BookingCancelledByGuest]: { icon: { ios: 'calendar.badge.minus', android: 'event_busy' }, tone: 'danger' },
  [NotificationType.BookingConfirmed]: { icon: { ios: 'checkmark.seal', android: 'verified' }, tone: 'success' },
  [NotificationType.BookingCancelled]: { icon: { ios: 'xmark.circle', android: 'cancel' }, tone: 'danger' },
  [NotificationType.TaskAssigned]: { icon: { ios: 'sparkles', android: 'cleaning_services' }, tone: 'info' },
  [NotificationType.TaskUrgent]: { icon: { ios: 'exclamationmark.triangle', android: 'priority_high' }, tone: 'warning' },
};

/** What each type means, for the settings switches */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { title: string; detail: string }> = {
  [NotificationType.NewBooking]: { title: 'New online bookings', detail: 'A guest booked and it needs approval' },
  [NotificationType.BookingCancelledByGuest]: { title: 'Guest cancellations', detail: 'A guest cancelled their booking' },
  [NotificationType.BookingConfirmed]: { title: 'Booking confirmed', detail: 'The hotel accepted your booking' },
  [NotificationType.BookingCancelled]: { title: 'Booking cancelled', detail: 'The hotel cancelled your booking' },
  [NotificationType.TaskAssigned]: { title: 'Tasks for you', detail: 'A housekeeping task was given to you' },
  [NotificationType.TaskUrgent]: { title: 'Urgent tasks', detail: 'One of your tasks became urgent' },
};

/** One entry in the list: unread ones are bold with a dot */
export function NotificationRow({
  notification,
  first,
  onPress,
}: {
  notification: AppNotification;
  first?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const style = TYPE_STYLE[notification.type] ?? TYPE_STYLE[NotificationType.NewBooking];
  const tone = colors.tones[style.tone];
  const unread = !notification.isRead;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${notification.title}. ${notification.body}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.pill,
          backgroundColor: tone.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon ios={style.icon.ios} android={style.icon.android} size={18} color={tone.fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="body" weight={unread ? '700' : '500'} style={{ flex: 1 }} numberOfLines={2}>
            {notification.title}
          </Text>
          {unread && (
            <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.primary }} />
          )}
        </View>
        <Text variant="callout" color="muted">
          {notification.body}
        </Text>
        <Text variant="caption" color="subtle">
          {formatServerTime(notification.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

/** A bell for screen headers, with the number of unread notifications */
export function NotificationBell() {
  const { colors } = useTheme();
  const { data: unread = 0 } = useUnreadCount();
  const label = unread > 99 ? '99+' : String(unread);

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      hitSlop={8}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: space.sm }}
    >
      <Icon ios="bell" android="notifications" size={22} color={colors.text} />
      {unread > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 4,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: radius.pill,
            backgroundColor: colors.tones.danger.fg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="caption" weight="700" style={{ color: '#fff', fontSize: 11, lineHeight: 14 }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
