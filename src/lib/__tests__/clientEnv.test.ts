import { describe, it, expect } from "vitest";
import {
  REQUIRED_CLIENT_ENV_VARS,
  getClientEnvCheck,
} from "../clientEnv";

describe("clientEnv", () => {
  it("lists all required VITE_ variables", () => {
    expect(REQUIRED_CLIENT_ENV_VARS).toEqual([
      "VITE_API_URL",
      "VITE_CLOUDINARY_CLOUD_NAME",
      "VITE_CLOUDINARY_UPLOAD_PRESET",
    ]);
  });

  it("getClientEnvCheck reports loaded keys from import.meta.env", () => {
    const check = getClientEnvCheck();
    expect(check.variables).toHaveLength(3);
    expect(check.variables.map((v) => v.key)).toEqual([
      "VITE_API_URL",
      "VITE_CLOUDINARY_CLOUD_NAME",
      "VITE_CLOUDINARY_UPLOAD_PRESET",
    ]);
    expect(["ok", "error"]).toContain(check.status);
  });
});
