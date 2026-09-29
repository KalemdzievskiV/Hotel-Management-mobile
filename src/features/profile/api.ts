import { request } from '@/lib/http';
import type { GuestProfile, ProfileUpdate } from '@/lib/types';

export const profileApi = {
  /** The signed-in guest's profile; the API creates it from the account on first use */
  get: () => request<GuestProfile>('GET', '/Guests/me'),
  update: (profile: ProfileUpdate) => request<GuestProfile>('PUT', '/Guests/me', profile),
};
