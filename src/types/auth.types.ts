export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    fullName?: string;
    status: string;
  };
}
