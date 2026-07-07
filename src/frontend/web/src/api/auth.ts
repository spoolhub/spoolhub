import { apiClient } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth'

export const authApi = {
  login: (body: LoginRequest) =>
    apiClient.post<AuthResponse>('/api/auth/login', body).then(r => r.data),

  register: (body: RegisterRequest) =>
    apiClient.post<AuthResponse>('/api/auth/register', body).then(r => r.data),
}
