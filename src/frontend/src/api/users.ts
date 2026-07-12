import { apiClient } from './client'
import type { ChangePasswordRequest, UpdateUserRequest, UserResponse } from '@/types/user'

export const usersApi = {
  getMe: () =>
    apiClient.get<UserResponse>('/api/users/me').then(r => r.data),

  updateMe: (body: UpdateUserRequest) =>
    apiClient.put<UserResponse>('/api/users/me', body).then(r => r.data),

  changePassword: (body: ChangePasswordRequest) =>
    apiClient.put('/api/users/me/password', body),
}
