import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, FormError, Icon, Text, TextField, useScreenStyles } from '@/components';
import { useAuth } from '@/lib/auth';
import { API_URL, errorText } from '@/lib/http';
import { radius, space, useTheme } from '@/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim() !== '' && password !== '' && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={screen.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: space.md, marginBottom: space.md }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.lg,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon ios="building.2.fill" android="apartment" size={28} color={colors.onPrimary} />
            </View>
            <Text variant="display">Welcome</Text>
            <Text variant="body" color="muted">
              {"Sign in to book your next stay, or to run your hotel's bookings, rooms and housekeeping."}
            </Text>
          </View>

          <TextField
            label="Email"
            icon={{ ios: 'envelope', android: 'mail' }}
            placeholder="you@hotel.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
          />
          <TextField
            ref={passwordRef}
            label="Password"
            icon={{ ios: 'lock', android: 'lock' }}
            placeholder="Your password"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
          />

          <FormError message={error} />

          <Button title="Sign in" onPress={submit} loading={busy} disabled={!canSubmit} style={{ marginTop: space.sm }} />
          <Button
            title="Forgot password?"
            variant="ghost"
            size="sm"
            style={{ alignSelf: 'center' }}
            onPress={() =>
              // There's no self-service reset in the API yet
              Alert.alert(
                'Forgot your password?',
                "Resetting it from the app isn't available yet. Ask the hotel you booked with, or the hotel's manager if you work there, to help you get back in."
              )
            }
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text variant="caption" color="subtle">
              New here?
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>
          <Button
            title="Create a guest account"
            variant="secondary"
            icon={{ ios: 'person.badge.plus', android: 'person_add' }}
            onPress={() => router.push('/register')}
          />

          <Text variant="caption" color="subtle" align="center" style={{ marginTop: space.xl }}>
            Server: {API_URL.replace(/^https?:\/\//, '')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
