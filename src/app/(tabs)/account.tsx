import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Avatar, Button, Card, Icon, KeyValue, ListRow, SectionHeader, Skeleton, Text, useScreenStyles } from '@/components';
import { useAuth } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useHotel } from '@/lib/hotel';
import { API_URL } from '@/lib/http';
import { radius, space, useTheme } from '@/theme';

// "1.0.0 (build 29812345)" in an APK; builds are numbered by android-build/build.sh and CI
function appVersion(): string {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'Expo Go (development)';
  const version = Constants.expoConfig?.version ?? '?';
  const build = Constants.expoConfig?.android?.versionCode;
  return build ? `${version} (build ${build})` : version;
}

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super admin',
  Admin: 'Owner / admin',
  Manager: 'Manager',
  Housekeeper: 'Housekeeping',
  Guest: 'Guest',
};

export default function AccountScreen() {
  const screen = useScreenStyles();
  const { user, isStaff, logout } = useAuth();

  const confirmLogout = () => {
    haptics.warning();
    Alert.alert('Sign out?', 'You will need your password to sign in again.', [
      { text: 'Stay signed in', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <ScrollView style={screen.screen} contentContainerStyle={screen.content}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <Avatar name={user?.fullName ?? ''} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" numberOfLines={1}>
            {user?.fullName}
          </Text>
          <Text variant="callout" color="muted" numberOfLines={1}>
            {user?.email}
          </Text>
          <Text variant="caption" color="primary" style={{ marginTop: 2 }}>
            {user?.roles.map((role) => ROLE_LABELS[role] ?? role).join(' · ')}
          </Text>
        </View>
      </Card>

      {isStaff && <HotelPicker />}

      <SectionHeader title="Account" />
      <Card padded={false}>
        {!isStaff && (
          <ListRow
            first
            icon={{ ios: 'person.text.rectangle', android: 'badge' }}
            title="Your details"
            detail="Name, phone and address"
            onPress={() => router.push('/profile')}
          />
        )}
        <ListRow
          first={isStaff}
          icon={{ ios: 'key', android: 'key' }}
          title="Change password"
          onPress={() => router.push('/change-password')}
        />
      </Card>

      <SectionHeader title="App" />
      <Card>
        <KeyValue label="Version" value={appVersion()} />
        <KeyValue label="Server" value={API_URL.replace(/^https?:\/\//, '').replace(/\/api$/, '')} />
      </Card>

      <Button
        title="Sign out"
        variant="secondary"
        icon={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }}
        onPress={confirmLogout}
        style={{ marginTop: space.lg }}
      />
    </ScrollView>
  );
}

function HotelPicker() {
  const { colors } = useTheme();
  const { hotels, hotel, selectHotel, loading, error, reload } = useHotel();

  return (
    <>
      <SectionHeader title={hotels.length > 1 ? 'Working at' : 'Hotel'} />
      <Card padded={false} style={{ paddingVertical: space.xs }}>
        {loading && (
          <View style={{ padding: space.lg, gap: space.sm }}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="30%" />
          </View>
        )}
        {error && (
          <Pressable onPress={reload} style={{ padding: space.lg }}>
            <Text variant="callout" color="danger">
              {error} · Tap to retry
            </Text>
          </Pressable>
        )}
        {!loading && !error && hotels.length === 0 && (
          <Text variant="callout" color="subtle" style={{ padding: space.lg }}>
            Not assigned to a hotel yet
          </Text>
        )}
        {hotels.map((h, index) => {
          const active = h.id === hotel?.id;
          return (
            <Pressable
              key={h.id}
              onPress={() => {
                haptics.selection();
                selectHotel(h.id);
              }}
              disabled={hotels.length === 1}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                borderTopWidth: index > 0 ? 1 : 0,
                borderTopColor: colors.border,
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.sm,
                  backgroundColor: active ? colors.tones.primary.bg : colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  ios="building.2"
                  android="apartment"
                  size={18}
                  color={active ? colors.tones.primary.fg : colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">{h.name}</Text>
                <Text variant="callout" color="muted">
                  {h.city}
                </Text>
              </View>
              {active && hotels.length > 1 && (
                <Icon ios="checkmark.circle.fill" android="check_circle" color={colors.primary} size={22} />
              )}
            </Pressable>
          );
        })}
      </Card>
    </>
  );
}
