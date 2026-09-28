import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useHotel } from '@/lib/hotel';
import { Button, colors, Field, Icon, styles } from '@/components/ui';

// "1.0.0 (build 29812345)" in an APK; builds are numbered by android-build/build.sh and CI
function appVersion(): string {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'Expo Go (development)';
  const version = Constants.expoConfig?.version ?? '?';
  const build = Constants.expoConfig?.android?.versionCode;
  return build ? `${version} (build ${build})` : version;
}

export default function AccountScreen() {
  const { user, isStaff, logout } = useAuth();

  const confirmLogout = () =>
    Alert.alert('Sign out?', undefined, [
      { text: 'Stay signed in', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.list}>
      <View style={styles.card}>
        <Text style={[styles.title, { fontSize: 20 }]}>{user?.fullName}</Text>
        <Text style={styles.muted}>{user?.email}</Text>
        <Text style={styles.muted}>{user?.roles.join(', ')}</Text>
      </View>

      {isStaff && <HotelPicker />}

      <Text style={styles.sectionTitle}>App</Text>
      <View style={styles.card}>
        <Field label="Version" value={appVersion()} />
        <Field label="Server" value={API_URL.replace(/^https?:\/\//, '')} />
      </View>

      <Button title="Sign out" variant="secondary" onPress={confirmLogout} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

function HotelPicker() {
  const { hotels, hotel, selectHotel, loading, error, reload } = useHotel();

  return (
    <>
      <Text style={styles.sectionTitle}>{hotels.length > 1 ? 'Show hotel' : 'Hotel'}</Text>
      <View style={[styles.card, { paddingVertical: 4 }]}>
        {loading && <ActivityIndicator style={{ paddingVertical: 10 }} color={colors.primary} />}
        {error && (
          <Pressable onPress={reload} style={{ paddingVertical: 10 }}>
            <Text style={styles.error}>{error} · Tap to retry</Text>
          </Pressable>
        )}
        {!loading && !error && hotels.length === 0 && (
          <Text style={[styles.empty, { paddingVertical: 10 }]}>Not assigned to a hotel yet</Text>
        )}
        {hotels.map((h, index) => (
          <Pressable
            key={h.id}
            onPress={() => selectHotel(h.id)}
            disabled={hotels.length === 1}
            style={({ pressed }) => [
              styles.rowTop,
              { paddingVertical: 10 },
              index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              pressed && { opacity: 0.6 },
            ]}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.title}>{h.name}</Text>
              <Text style={styles.muted}>{h.city}</Text>
            </View>
            {h.id === hotel?.id && hotels.length > 1 && (
              <Icon ios="checkmark" android="check" color={colors.primary} size={22} />
            )}
          </Pressable>
        ))}
      </View>
    </>
  );
}
