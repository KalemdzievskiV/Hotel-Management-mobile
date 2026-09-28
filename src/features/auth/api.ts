import { request } from '@/lib/http';
import type { AuthResponse } from '@/lib/types';

export const authApi = {
  login: (email: string, password: string) => request<AuthResponse>('POST', '/Auth/login', { email, password }),
  /** Ends this device's session on the server; the refresh token stops working */
  logout: (refreshToken: string) => request<void>('POST', '/Auth/logout', { refreshToken }),
};
