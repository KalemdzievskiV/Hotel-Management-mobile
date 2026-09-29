import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationType } from '@/lib/types';
import { notificationsApi } from './api';

// Push needs a real build: Expo Go on Android can't receive pushes (SDK 53+), and the web
// preview has no push at all. Everything here quietly does nothing there.
export const pushSupported =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** Must match ExpoPushClient.AndroidChannelId on the server, or Android drops the push */
const ANDROID_CHANNEL = 'default';

// A push that arrives while the app is open still shows as a banner
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** What the server puts in every push's data (NotificationService.PushData) */
export interface PushData {
  notificationId?: number;
  type?: keyof typeof NotificationType;
  hotelId?: number;
  reservationId?: number;
  taskId?: number;
}

/** The token this phone registered, so sign-out can unregister exactly that one */
let registeredToken: string | null = null;

/**
 * Asks for permission (once; Android 13+ and iOS show a prompt), then tells the server where to
 * send this user's pushes. Returns false when pushes can't reach this phone.
 */
export async function registerForPush(): Promise<boolean> {
  if (!pushSupported) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Bookings and tasks',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return false;

    // Uses the EAS projectId from app.json. Fails on Android until Firebase is set up
    // (google-services.json, README → "Push notifications").
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await notificationsApi.registerDevice(token, Platform.OS === 'ios' ? 'ios' : 'android');
    registeredToken = token;
    return true;
  } catch (error) {
    if (__DEV__) console.warn('Push registration failed', error);
    return false;
  }
}

/** Sign-out: stop this user's pushes to this phone. Best effort, never slower than 3 s. */
export async function unregisterForPush(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  await Promise.race([
    notificationsApi.unregisterDevice(token).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

/** Whether the phone lets the app show notifications at all (a switch in the phone's settings) */
export async function pushPermission(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
  if (!pushSupported) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Where a notification leads. The same routes work as links (hotelmgmt://reservations/12),
 * so a push and a link open the same screen.
 */
export function notificationHref(
  target: { reservationId?: number | null; taskId?: number | null },
  canManage: boolean
): string {
  if (target.reservationId) return `/reservations/${target.reservationId}`;
  // Managers open housekeeping from More; for housekeepers it's a tab
  if (target.taskId) return canManage ? '/tasks' : '/housekeeping';
  return '/notifications';
}
