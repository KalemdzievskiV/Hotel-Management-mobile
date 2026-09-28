import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Loading } from '@/components/ui';

function RootStack() {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;

  return (
    <Stack screenOptions={{ headerTitleStyle: { fontWeight: '600' } }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="index" options={{ title: 'Reservations' }} />
        <Stack.Screen name="reservations/[id]" options={{ title: 'Reservation' }} />
        <Stack.Screen name="hotels" options={{ title: 'Hotels' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootStack />
    </AuthProvider>
  );
}
