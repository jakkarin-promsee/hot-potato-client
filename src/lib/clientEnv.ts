import type { EnvCheck } from "@/stores/status.store";

/** Keep in sync with client/README.md and client/CLAUDE.md. */
export const REQUIRED_CLIENT_ENV_VARS = [
  "VITE_API_URL",
  "VITE_CLOUDINARY_CLOUD_NAME",
  "VITE_CLOUDINARY_UPLOAD_PRESET",
] as const;

export type RequiredClientEnvVar = (typeof REQUIRED_CLIENT_ENV_VARS)[number];

export function getClientEnvCheck(): EnvCheck {
  const variables = REQUIRED_CLIENT_ENV_VARS.map((key) => ({
    key,
    loaded: Boolean(import.meta.env[key]),
  }));

  return {
    status: variables.every((v) => v.loaded) ? "ok" : "error",
    variables,
  };
}
