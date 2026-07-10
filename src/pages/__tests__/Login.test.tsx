// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../Login";

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({
    login: mockLogin,
    register: mockRegister,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function setInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function renderLogin(initial = "/login") {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return container!;
}

afterEach(() => {
  container?.remove();
  container = null;
  root = null;
});

beforeEach(() => {
  mockLogin.mockReset();
  mockRegister.mockReset();
  mockNavigate.mockReset();
  mockLogin.mockResolvedValue(undefined);
  mockRegister.mockResolvedValue(undefined);
});

describe("Login page", () => {
  it("renders Thai session banner from code query", () => {
    const el = renderLogin("/login?reason=raw&code=TOKEN_EXPIRED");
    expect(el.textContent).toContain(
      "เซสชันหมดอายุแล้ว เข้าสู่ระบบอีกครั้งเพื่อไปต่อได้เลย",
    );
    expect(el.textContent).not.toContain("raw");
  });

  it("mode toggle clears field errors", async () => {
    const el = renderLogin();
    const signInBtn = Array.from(el.querySelectorAll("button")).find((b) =>
      b.textContent?.trim() === "Sign in",
    );
    await act(async () => {
      signInBtn?.click();
    });
    expect(el.textContent).toContain("Email is required.");

    const createLink = Array.from(el.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Create account"),
    );
    await act(async () => {
      createLink?.click();
    });
    expect(el.textContent).not.toContain("Email is required.");
  });

  it("blocks submit when email format is invalid", async () => {
    const el = renderLogin();

    const email = el.querySelector("#email") as HTMLInputElement;
    const password = el.querySelector("#password") as HTMLInputElement;
    const form = el.querySelector("form") as HTMLFormElement;

    await act(async () => {
      setInputValue(email, "not-an-email");
      setInputValue(password, "password-123");
      form.requestSubmit();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("blocks signup with short password", async () => {
    const el = renderLogin();
    const createLink = Array.from(el.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Create account"),
    );
    await act(async () => {
      createLink?.click();
    });

    const name = el.querySelector("#name") as HTMLInputElement;
    const email = el.querySelector("#email") as HTMLInputElement;
    const password = el.querySelector("#password") as HTMLInputElement;
    const submit = el.querySelector("button[type='submit']") as HTMLButtonElement;

    await act(async () => {
      setInputValue(name, "Test User");
      setInputValue(email, "user@test.local");
      setInputValue(password, "short");
      submit.click();
    });

    expect(el.textContent).toContain("Password must be at least 8 characters.");
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("navigates to state.from after successful login", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <MemoryRouter
          initialEntries={[{ pathname: "/login", state: { from: "/history" } }]}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    const email = container.querySelector("#email") as HTMLInputElement;
    const password = container.querySelector("#password") as HTMLInputElement;
    const form = container.querySelector("form") as HTMLFormElement;

    await act(async () => {
      setInputValue(email, "a@test.local");
      setInputValue(password, "password-123");
      form.requestSubmit();
    });

    expect(mockLogin).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/history", { replace: true });
  });

  it("falls back to /explore for malicious redirect", async () => {
    const el = renderLogin("/login?redirect=//evil.com");
    const email = el.querySelector("#email") as HTMLInputElement;
    const password = el.querySelector("#password") as HTMLInputElement;
    const form = el.querySelector("form") as HTMLFormElement;

    await act(async () => {
      setInputValue(email, "a@test.local");
      setInputValue(password, "password-123");
      form.requestSubmit();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/explore", { replace: true });
  });
});
