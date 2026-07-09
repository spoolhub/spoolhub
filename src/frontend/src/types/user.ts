export interface UserResponse {
  id: string
  username: string
  fullName: string | null
  createdAt: string
}

export interface UpdateUserRequest {
  fullName?: string | null
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
