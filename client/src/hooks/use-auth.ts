"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { QUERY_KEYS } from "@/constants";
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
import { ApiError } from "@/types/api";

export function useCurrentUser() {
  return useQuery({
    queryKey: QUERY_KEYS.currentUser,
    queryFn: authApi.showCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: async (data) => {
      if ("tokenUser" in data) {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
      }
    },
  });
}

export function useCompleteTwoFactorLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompleteTwoFactorLoginPayload) => authApi.completeTwoFactorLogin(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      queryClient.clear();
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (payload: VerifyEmailPayload) => authApi.verifyEmail(payload),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (payload: ResendVerificationPayload) => authApi.resendVerification(payload),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => authApi.updateUser(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
}

export function useUpdateUserPassword() {
  return useMutation({
    mutationFn: (payload: UpdateUserPasswordPayload) => authApi.updateUserPassword(payload),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => authApi.forgotPassword(payload),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => authApi.resetPassword(payload),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeleteAccountPayload) => authApi.deleteAccount(payload),
    onSettled: () => {
      queryClient.clear();
    },
  });
}

export function isUnauthenticated(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}
