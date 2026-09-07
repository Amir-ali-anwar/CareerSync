import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { ApiError, type ApiErrorPayload } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
});

let refreshPromise: Promise<unknown> | null = null;

const REFRESH_EXEMPT_PATHS = ["/auth/login", "/auth/refresh-token", "/auth/register"];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const requestPath = originalRequest?.url || "";
    const isExempt = REFRESH_EXEMPT_PATHS.some((path) => requestPath.includes(path));

    if (error.response?.status === 401 && originalRequest && !isExempt && !originalRequest._retried) {
      originalRequest._retried = true;
      try {
        refreshPromise ||= apiClient.post("/auth/refresh-token");
        await refreshPromise;
        refreshPromise = null;
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:session-expired"));
        }
        return Promise.reject(normalizeError(refreshError as AxiosError<ApiErrorPayload>));
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

export function normalizeError(error: AxiosError<ApiErrorPayload>): ApiError {
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.msg || "Something went wrong. Please try again.";
    return new ApiError(status >= 500 ? "Something went wrong. Please try again." : message, status, data?.requestId);
  }
  if (error.request) {
    return new ApiError("Unable to reach the server. Check your connection and try again.", 0);
  }
  return new ApiError(error.message || "Unexpected error.", 0);
}

export { API_BASE_URL };
