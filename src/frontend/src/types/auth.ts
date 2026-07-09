export interface AuthResponse {
  id: string
  username: string
  fullName: string | null
  token: string
  expiresAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  fullName?: string
  password: string
}
