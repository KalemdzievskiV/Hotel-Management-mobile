import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small vibrations that confirm what happened. Never awaited: feedback mustn't hold up the UI,
// and a device without haptics simply feels nothing.
const enabled = Platform.OS !== 'web';

export const haptics = {
  /** Switching a tab, segment or chip */
  selection: () => enabled && void Haptics.selectionAsync().catch(() => undefined),
  /** A button press that starts something */
  tap: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  /** Checked in, paid, task done */
  success: () =>
    enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  /** Before a destructive choice */
  warning: () =>
    enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
  error: () => enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined),
};
