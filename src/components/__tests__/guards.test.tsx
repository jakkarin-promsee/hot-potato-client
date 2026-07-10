// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";
import { RequireLogin } from "../RequireLogin";

let authToken: string | null = null;

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (s: { token: string | null }) => unknown) =>
    selector({ token: authToken }),
}));

function LoginCapture() {
  const location = useLocation();
  return (
    <div data-testid="login-from">{String(location.state?.from ?? "")}</div>
  );
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container!;
}

afterEach(() => {
  container?.remove();
  container = null;
  root = null;
});

describe("ProtectedRoute", () => {
  it("redirects to /login carrying state.from", () => {
    authToken = null;
    const el = render(
      <MemoryRouter initialEntries={["/dashboard?tab=mine"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Secret</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginCapture />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(el.querySelector("[data-testid='login-from']")?.textContent).toBe(
      "/dashboard?tab=mine",
    );
    expect(el.textContent).not.toContain("Secret");
  });
});

describe("RequireLogin", () => {
  it("renders prompt with login link when logged out", () => {
    authToken = null;
    const el = render(
      <MemoryRouter initialEntries={["/history"]}>
        <Routes>
          <Route
            path="/history"
            element={
              <RequireLogin title="Sign in" description="Need account">
                <div>History content</div>
              </RequireLogin>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(el.querySelector("a[href='/login']")).toBeTruthy();
    expect(el.textContent).not.toContain("History content");
  });
});
