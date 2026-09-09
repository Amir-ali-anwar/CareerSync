import type { UserRole } from "./user";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  lastName: string;
  email: string;
  password: string;
  location: {
    country: string;
    city: string;
  };
  role: UserRole;
  phone: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
}

export interface UpdateUserPayload {
  name: string;
  email: string;
}

export interface UpdateUserPasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface DeleteAccountPayload {
  password: string;
}

export interface CompleteTwoFactorLoginPayload {
  tempToken: string;
  token: string;
}
