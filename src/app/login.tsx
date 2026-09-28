import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Icon, Text, TextField, useScreenStyles } from '@/components';
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
            <Text variant="display">Welcome back</Text>
            <Text variant="body" color="muted">
              Sign in with your hotel account to manage bookings, rooms and housekeeping.
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

          {error && (
            <View
              accessibilityRole="alert"
              style={{
                flexDirection: 'row',
                gap: space.sm,
                alignItems: 'center',
                backgroundColor: colors.tones.danger.bg,
                borderRadius: radius.md,
                padding: space.md,
              }}
            >
              <Icon ios="exclamationmark.circle" android="error" size={18} color={colors.tones.danger.fg} />
              <Text variant="callout" color="danger" style={{ flex: 1 }}>
                {error}
              </Text>
            </View>
          )}

          <Button title="Sign in" onPress={submit} loading={busy} disabled={!canSubmit} style={{ marginTop: space.sm }} />

          <Text variant="caption" color="subtle" align="center" style={{ marginTop: space.xl }}>
            Server: {API_URL.replace(/^https?:\/\//, '')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
