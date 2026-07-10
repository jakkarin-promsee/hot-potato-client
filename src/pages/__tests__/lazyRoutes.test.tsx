// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import App from "../../App";

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (s: { token: string | null; recheckToken: () => void }) => unknown) =>
    selector({ token: null, recheckToken: vi.fn() }),
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderApp() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<App />);
  });
  return container!;
}

beforeEach(() => {
  window.happyDOM.setURL("http://localhost/");
});

afterEach(() => {
  container?.remove();
  container = null;
  root = null;
});

describe("lazy routes", () => {
  it("only Landing and NotFound are statically imported from pages", () => {
    const appSrc = readFileSync(
      path.resolve(process.cwd(), "src/App.tsx"),
      "utf8",
    );
    const staticPageImports = [
      ...appSrc.matchAll(/^import .+ from "\.\/pages\/(\w+)"/gm),
    ].map((m) => m[1]);
    expect(staticPageImports.sort()).toEqual(["Landing", "NotFound"]);
  });

  it("renders Landing eagerly on / without Suspense round-trip", () => {
    window.history.pushState({}, "", "/");
    const el = renderApp();
    expect(el.textContent).toContain("Manga-style lessons");
  });

  it("resolves a lazy route through Suspense", async () => {
    window.history.pushState({}, "", "/guide");
    const el = renderApp();
    await vi.waitFor(() => {
      expect(el.textContent).toContain("Ready to start?");
    });
  });
});
