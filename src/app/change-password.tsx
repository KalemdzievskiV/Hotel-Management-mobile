import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput } from 'react-native';
import { Button, FormError, Text, TextField, useScreenStyles, useToast } from '@/components';
import { PASSWORD_RULES } from '@/features/auth/api';
import { PasswordRules } from '@/features/auth/components';
import { useAuth } from '@/lib/auth';
import { errorText } from '@/lib/http';
import { space } from '@/theme';

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const screen = useScreenStyles();
  const toast = useToast();
  const newRef = useRef<TextInput>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strong = PASSWORD_RULES.every((rule) => rule.test(next));
  const same = next !== '' && next === current;
  const canSubmit = current !== '' && strong && !same && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      toast.show('Password changed');
      router.back();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={screen.screen}>
      <ScrollView contentContainerStyle={[screen.content, { gap: space.lg }]} keyboardShouldPersistTaps="handled">
        <Text variant="body" color="muted">
          {"You'll stay signed in here. Other phones and browsers signed in to your account will need the new password."}
        </Text>
        <TextField
          label="Current password"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          value={current}
          onChangeText={setCurrent}
          onSubmitEditing={() => newRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          ref={newRef}
          label="New password"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          value={next}
          onChangeText={setNext}
          onSubmitEditing={submit}
          error={same ? 'Pick a password different from the current one' : null}
        />
        <PasswordRules password={next} />
        <FormError message={error} />
        <Button title="Change password" onPress={submit} loading={busy} disabled={!canSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
