import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useHotel } from '@/lib/hotel';
import { notificationsApi } from './api';
import { invalidateNotifications } from './hooks';
import { notificationHref, registerForPush, type PushData } from './push';

// A tap is handled once, even when the app later reads the same "last response" again
const handledResponses = new Set<string>();

/**
 * While someone is signed in: registers the phone for their pushes, reloads the notification
 * list when one arrives, and opens the right screen when one is tapped (also when the tap
 * started the app).
 */
export function usePushNotifications() {
  const { user, ready, isStaff, canManage } = useAuth();
  const { selectHotel } = useHotel();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // The listeners live as long as the session; they read the latest values from here
  const latest = useRef({ isStaff, canManage, selectHotel });
  useEffect(() => {
    latest.current = { isStaff, canManage, selectHotel };
  });

  useEffect(() => {
    if (!userId) return;
    void registerForPush();
  }, [userId]);

  useEffect(() => {
    // Only once the screens are there to navigate to
    if (!ready || !userId || Platform.OS === 'web') return;

    const open = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handledResponses.has(id)) return;
      handledResponses.add(id);

      const data = (response.notification.request.content.data ?? {}) as PushData;
      const { isStaff, canManage, selectHotel } = latest.current;
      // A booking or task at another of the user's hotels: switch to that hotel first
      if (isStaff && data.hotelId) selectHotel(data.hotelId);
      if (data.notificationId) {
        notificationsApi
          .markRead(data.notificationId)
          .then(() => invalidateNotifications(queryClient))
          .catch(() => undefined);
      }
      router.push(notificationHref({ reservationId: data.reservationId, taskId: data.taskId }, canManage));
    };

    const last = Notifications.getLastNotificationResponse();
    if (last) open(last);

    const tapped = Notifications.addNotificationResponseReceivedListener(open);
    const received = Notifications.addNotificationReceivedListener(() => invalidateNotifications(queryClient));
    return () => {
      tapped.remove();
      received.remove();
    };
  }, [ready, userId, queryClient]);
}
