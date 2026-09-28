import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/auth';
import { HotelProvider } from '@/lib/hotel';
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="reservations/[id]" options={{ title: 'Reservation' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <HotelProvider>
        <StatusBar style="dark" />
        <RootStack />
      </HotelProvider>
    </AuthProvider>
  );
}
