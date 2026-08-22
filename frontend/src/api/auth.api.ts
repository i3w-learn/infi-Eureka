import { apiRequest } from './client';
import type { User } from './types';

/** Session lookup. Login and signup live in otp-auth.api.ts. */
export const authApi = {
  me: () => apiRequest<User>('/me'),
};
