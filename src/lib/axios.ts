// lib/axios.ts
import { useAuthStore } from "@/stores/auth.store";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/canvas",
  "/uploadimage",
  "/history",
  "/create",
  "/profile",
  "/change-password",
  "/settings",
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Safe redirect target: same-origin path only (no open redirects). */
export function isSafeRedirectTarget(target: string): boolean {
  return target.startsWith("/") && !target.startsWith("//");
}

export function buildForcedLoginUrl(
  pathname: string,
  search: string,
  message: string,
  code?: string,
): string {
  const params = new URLSearchParams();
  params.set("reason", message);
  if (code) params.set("code", code);
  const redirect = `${pathname}${search}`;
  if (redirect && redirect !== "/") {
    params.set("redirect", redirect);
  }
  return `/login?${params.toString()}`;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const shouldForceRelogin =
      error?.response?.status === 401 &&
      (error?.response?.data?.forceRelogin === true ||
        error?.response?.data?.clearToken === true);
    const skipAuthRedirect = Boolean((error?.config as { skipAuthRedirect?: boolean })?.skipAuthRedirect);

    if (shouldForceRelogin) {
      useAuthStore.getState().logout();

      if (
        typeof window !== "undefined" &&
        !skipAuthRedirect &&
        window.location.pathname !== "/login" &&
        isProtectedPath(window.location.pathname)
      ) {
        const message =
          typeof error?.response?.data?.message === "string"
            ? error.response.data.message
            : "Session expired. Please login again.";
        const code =
          typeof error?.response?.data?.code === "string"
            ? error.response.data.code
            : undefined;
        const url = buildForcedLoginUrl(
          window.location.pathname,
          window.location.search,
          message,
          code,
        );
        window.location.replace(url);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
