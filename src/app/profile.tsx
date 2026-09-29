import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import {
  Button,
  Card,
  ErrorState,
  FormError,
  KeyValue,
  SectionHeader,
  SkeletonList,
  TextField,
  useScreenStyles,
  useToast,
} from '@/components';
import { nameError } from '@/features/auth/api';
import { useMyProfile, useUpdateProfile } from '@/features/profile/hooks';
import { useAuth } from '@/lib/auth';
import { errorText } from '@/lib/http';
import type { GuestProfile } from '@/lib/types';
import { space } from '@/theme';

/** A guest's own details, which the hotel sees on their bookings */
export default function ProfileScreen() {
  const profile = useMyProfile();
  if (profile.isPending) return <SkeletonList count={2} header={false} />;
  if (!profile.data) return <ErrorState message={errorText(profile.error)} onRetry={() => void profile.refetch()} />;
  return <ProfileForm profile={profile.data} />;
}

const FIELDS = ['firstName', 'lastName', 'phoneNumber', 'nationality', 'address', 'city', 'postalCode', 'country'] as const;
type Field = (typeof FIELDS)[number];

function ProfileForm({ profile }: { profile: GuestProfile }) {
  const screen = useScreenStyles();
  const toast = useToast();
  const { setFullName } = useAuth();
  const update = useUpdateProfile();
  const [form, setForm] = useState(() =>
    Object.fromEntries(FIELDS.map((field) => [field, profile[field] ?? ''])) as Record<Field, string>
  );
  const [error, setError] = useState<string | null>(null);

  const set = (field: Field) => (value: string) => setForm((f) => ({ ...f, [field]: value }));
  const errors = {
    firstName: nameError(form.firstName, 'First name'),
    lastName: nameError(form.lastName, 'Last name'),
    phoneNumber: form.phoneNumber.trim() && !/^[\d\s\-+().]+$/.test(form.phoneNumber) ? 'Use digits, spaces and + only' : null,
  };
  const changed = FIELDS.some((field) => form[field].trim() !== (profile[field] ?? ''));
  const valid = Object.values(errors).every((e) => e === null);

  const save = () => {
    setError(null);
    const trimmed = Object.fromEntries(FIELDS.map((field) => [field, form[field].trim()])) as Record<Field, string>;
    update.mutate(
      { ...trimmed, dateOfBirth: profile.dateOfBirth ?? null },
      {
        onSuccess: (saved) => {
          void setFullName(`${saved.firstName} ${saved.lastName}`);
          toast.show('Profile saved');
          router.back();
        },
        onError: (e) => setError(errorText(e)),
      }
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={screen.screen}>
      <ScrollView contentContainerStyle={[screen.content, { gap: space.md }]} keyboardShouldPersistTaps="handled">
        <Card>
          <KeyValue label="Email" value={profile.email} />
        </Card>

        <SectionHeader title="Name" />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="First name"
              autoComplete="given-name"
              value={form.firstName}
              onChangeText={set('firstName')}
              error={errors.firstName}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Last name"
              autoComplete="family-name"
              value={form.lastName}
              onChangeText={set('lastName')}
              error={errors.lastName}
            />
          </View>
        </View>

        <SectionHeader title="Contact" />
        <TextField
          label="Phone"
          icon={{ ios: 'phone', android: 'call' }}
          keyboardType="phone-pad"
          autoComplete="tel"
          value={form.phoneNumber}
          onChangeText={set('phoneNumber')}
          error={errors.phoneNumber}
          helper="So the hotel can reach you about your stay"
        />
        <TextField label="Nationality" value={form.nationality} onChangeText={set('nationality')} />

        <SectionHeader title="Address" />
        <TextField label="Street" autoComplete="street-address" value={form.address} onChangeText={set('address')} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 2 }}>
            <TextField label="City" value={form.city} onChangeText={set('city')} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Postcode"
              autoComplete="postal-code"
              value={form.postalCode}
              onChangeText={set('postalCode')}
            />
          </View>
        </View>
        <TextField label="Country" autoComplete="country" value={form.country} onChangeText={set('country')} />

        <FormError message={error} />
        <Button
          title="Save"
          onPress={save}
          loading={update.isPending}
          disabled={!changed || !valid}
          style={{ marginTop: space.sm }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
