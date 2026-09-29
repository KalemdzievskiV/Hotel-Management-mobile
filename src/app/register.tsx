import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { Button, FormError, Text, TextField, useScreenStyles } from '@/components';
import { nameError, PASSWORD_RULES } from '@/features/auth/api';
import { PasswordRules } from '@/features/auth/components';
import { useAuth } from '@/lib/auth';
import { errorText } from '@/lib/http';
import { space } from '@/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A guest creates an account and is signed in straight away */
export default function RegisterScreen() {
  const { register } = useAuth();
  const screen = useScreenStyles();
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  // Field errors show once a field has been left, or after trying to submit
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (field: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [field]: value }));
  const leave = (field: keyof typeof form) => () => setTouched((t) => ({ ...t, [field]: true }));

  const errors = {
    firstName: nameError(form.firstName, 'First name'),
    lastName: nameError(form.lastName, 'Last name'),
    email: EMAIL_PATTERN.test(form.email.trim()) ? null : 'Enter a valid email address',
    phone: form.phone.trim() && !/^[\d\s\-+().]+$/.test(form.phone) ? 'Use digits, spaces and + only' : null,
    password: PASSWORD_RULES.every((rule) => rule.test(form.password)) ? null : 'Meet all the rules below',
  };
  const valid = Object.values(errors).every((e) => e === null);
  const shown = (field: keyof typeof errors) => (touched[field] ? errors[field] : null);

  const submit = async () => {
    setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true });
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        phoneNumber: form.phone.trim() || undefined,
      });
      // Signed in: the protected routes take over from here
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <View style={screen.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: space.sm }}>
            <Text variant="display">Create your account</Text>
            <Text variant="body" color="muted">
              Book rooms and keep track of your stays.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="First name"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                value={form.firstName}
                onChangeText={set('firstName')}
                onBlur={leave('firstName')}
                onSubmitEditing={() => lastNameRef.current?.focus()}
                submitBehavior="submit"
                error={shown('firstName')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                ref={lastNameRef}
                label="Last name"
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="next"
                value={form.lastName}
                onChangeText={set('lastName')}
                onBlur={leave('lastName')}
                onSubmitEditing={() => emailRef.current?.focus()}
                submitBehavior="submit"
                error={shown('lastName')}
              />
            </View>
          </View>

          <TextField
            ref={emailRef}
            label="Email"
            icon={{ ios: 'envelope', android: 'mail' }}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            value={form.email}
            onChangeText={set('email')}
            onBlur={leave('email')}
            onSubmitEditing={() => phoneRef.current?.focus()}
            submitBehavior="submit"
            error={shown('email')}
          />
          <TextField
            ref={phoneRef}
            label="Phone (optional)"
            icon={{ ios: 'phone', android: 'call' }}
            placeholder="So the hotel can reach you"
            autoComplete="tel"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            returnKeyType="next"
            value={form.phone}
            onChangeText={set('phone')}
            onBlur={leave('phone')}
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
            error={shown('phone')}
          />
          <View style={{ gap: space.sm }}>
            <TextField
              ref={passwordRef}
              label="Password"
              icon={{ ios: 'lock', android: 'lock' }}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              value={form.password}
              onChangeText={set('password')}
              onBlur={leave('password')}
              onSubmitEditing={submit}
            />
            <PasswordRules password={form.password} />
          </View>

          <FormError message={error} />

          <Button title="Create account" onPress={submit} loading={busy} style={{ marginTop: space.sm }} />

          <Text variant="callout" color="muted" align="center">
            Already have an account?{' '}
            <Text variant="callout" weight="600" color="primary" onPress={() => router.back()} accessibilityRole="link">
              Sign in
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
