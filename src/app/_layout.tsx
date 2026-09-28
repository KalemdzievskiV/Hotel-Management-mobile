import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { EmptyState, LoadingScreen, OfflineBanner, ToastProvider } from '@/components';
import { AuthProvider, useAuth } from '@/lib/auth';
import { HotelProvider } from '@/lib/hotel';
import { persistMaxAge, queryClient, queryPersister } from '@/lib/query';
import { useTheme } from '@/theme';

function RootStack() {
  const { user, ready } = useAuth();
  const { colors } = useTheme();
  if (!ready) return <LoadingScreen />;

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="reservations/[id]" options={{ title: 'Booking', headerBackTitle: 'Back' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: persistMaxAge }}>
      <ThemeProvider value={theme.navigation}>
        <ToastProvider>
          <AuthProvider>
            <HotelProvider>
              <StatusBar style={theme.dark ? 'light' : 'dark'} />
              <RootStack />
              <OfflineBanner />
            </HotelProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}

/** Shown instead of a screen that crashed, so one bug doesn't take down the whole app */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <EmptyState
      icon={{ ios: 'exclamationmark.triangle', android: 'error' }}
      title="Something went wrong"
      message={error.message || 'The app hit an unexpected problem.'}
      action={{ title: 'Try again', onPress: () => void retry() }}
    />
  );
}
