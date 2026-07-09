import { defineConfig } from "vitest/config";
import path from "path";

// Vitest does not read vite.config.js's resolve here, so the `@` alias must be
// re-declared for tests to resolve `@/...` imports.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "happy-dom",
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
