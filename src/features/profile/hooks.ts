import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProfileUpdate } from '@/lib/types';
import { profileApi } from './api';

export const profileKeys = {
  me: ['profile', 'me'] as const,
};

export function useMyProfile() {
  return useQuery({ queryKey: profileKeys.me, queryFn: profileApi.get });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: ProfileUpdate) => profileApi.update(profile),
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.me, profile),
  });
}
