import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, Switch, View } from 'react-native';
import { Button, Card, ErrorState, SectionHeader, Skeleton, Text, useScreenStyles, useToast } from '@/components';
import { NOTIFICATION_TYPE_LABELS } from '@/features/notifications/components';
import { useNotificationPreferences, useUpdatePreference } from '@/features/notifications/hooks';
import { pushPermission, registerForPush } from '@/features/notifications/push';
import { haptics } from '@/lib/haptics';
import { errorText } from '@/lib/http';
import { space, useTheme } from '@/theme';

type Permission = Awaited<ReturnType<typeof pushPermission>>;

export default function NotificationSettingsScreen() {
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const preferences = useNotificationPreferences();
  const update = useUpdatePreference();
  const [permission, setPermission] = useState<Permission | null>(null);

  // Checked again when coming back from the phone's settings
  useFocusEffect(
    useCallback(() => {
      void pushPermission().then(setPermission);
    }, [])
  );

  const turnOn = async () => {
    // Asks when the phone still allows asking; otherwise only the phone's settings can
    const registered = await registerForPush();
    const now = await pushPermission();
    setPermission(now);
    if (!registered && now !== 'granted') void Linking.openSettings();
  };

  return (
    <ScrollView style={screen.screen} contentContainerStyle={screen.content}>
      {permission === 'unsupported' && (
        <Card>
          <Text variant="callout" color="muted">
            Push notifications work in the installed app, not in Expo Go or the browser. Everything still shows up in
            your notification list.
          </Text>
        </Card>
      )}
      {(permission === 'denied' || permission === 'undetermined') && (
        <Card style={{ gap: space.md }}>
          <Text variant="headline">Notifications are off</Text>
          <Text variant="callout" color="muted">
            {permission === 'denied'
              ? 'Your phone blocks notifications from this app. Turn them on in the phone’s settings.'
              : 'Allow notifications to hear about bookings and tasks as they happen.'}
          </Text>
          <Button
            title={permission === 'denied' ? 'Open phone settings' : 'Turn on notifications'}
            icon={{ ios: 'bell', android: 'notifications' }}
            onPress={() => void turnOn()}
          />
        </Card>
      )}

      <SectionHeader title="Send me a push for" />
      {preferences.isPending ? (
        <Card style={{ gap: space.md }}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={16} />
        </Card>
      ) : preferences.error ? (
        <ErrorState message={errorText(preferences.error)} onRetry={() => void preferences.refetch()} />
      ) : (
        <Card padded={false}>
          {preferences.data!.map((p, index) => {
            const label = NOTIFICATION_TYPE_LABELS[p.type];
            return (
              <View
                key={p.type}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  minHeight: 56,
                  paddingHorizontal: space.lg,
                  paddingVertical: space.sm,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="500">
                    {label?.title ?? String(p.type)}
                  </Text>
                  {label && (
                    <Text variant="caption" color="subtle">
                      {label.detail}
                    </Text>
                  )}
                </View>
                <Switch
                  value={p.pushEnabled}
                  onValueChange={(pushEnabled) => {
                    haptics.selection();
                    update.mutate(
                      { type: p.type, pushEnabled },
                      { onError: (error) => toast.show(errorText(error), 'error') }
                    );
                  }}
                  trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
                  accessibilityLabel={label?.title}
                />
              </View>
            );
          })}
        </Card>
      )}
      <Text variant="caption" color="subtle" style={{ paddingHorizontal: space.xs }}>
        Turned-off types still appear in your notification list, just without a push.
      </Text>
    </ScrollView>
  );
}
