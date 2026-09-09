import { apiClient } from "./client";
import type {
  CompleteTwoFactorLoginPayload,
  DeleteAccountPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResendVerificationPayload,
  ResetPasswordPayload,
  UpdateUserPasswordPayload,
  UpdateUserPayload,
  VerifyEmailPayload,
} from "@/types/auth";
import type { CurrentUser, TokenUser } from "@/types/user";

export type LoginResult = { tokenUser: TokenUser } | { requiresTwoFactor: true; tempToken: string };

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<{ msg: string }>("/auth/register", payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    apiClient.post<LoginResult>("/auth/login", payload).then((r) => r.data),

  completeTwoFactorLogin: (payload: CompleteTwoFactorLoginPayload) =>
    apiClient.post<{ tokenUser: TokenUser }>("/auth/2fa/login", payload).then((r) => r.data),

  logout: () => apiClient.get<{ msg: string }>("/auth/logout").then((r) => r.data),

  verifyEmail: (payload: VerifyEmailPayload) =>
    apiClient.post<{ msg: string }>("/auth/verify-Email", payload).then((r) => r.data),

  resendVerification: (payload: ResendVerificationPayload) =>
    apiClient.post<{ msg: string }>("/auth/resend-verification", payload).then((r) => r.data),

  showCurrentUser: () =>
    apiClient.get<{ user: CurrentUser }>("/auth/showCurrentUser").then((r) => r.data.user),

  updateUser: (payload: UpdateUserPayload) =>
    apiClient
      .patch<{ user: TokenUser; msg?: string }>("/auth/updateUser", payload)
      .then((r) => r.data),

  updateUserPassword: (payload: UpdateUserPasswordPayload) =>
    apiClient
      .patch<{ msg: string }>("/auth/updateUserPassword", payload)
      .then((r) => r.data),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiClient.post<{ msg: string }>("/auth/forgot-password", payload).then((r) => r.data),

  resetPassword: (payload: ResetPasswordPayload) =>
    apiClient.post<{ msg: string }>("/auth/reset-password", payload).then((r) => r.data),

  deleteAccount: (payload: DeleteAccountPayload) =>
    apiClient.delete<{ msg: string }>("/auth/me", { data: payload }).then((r) => r.data),
};
