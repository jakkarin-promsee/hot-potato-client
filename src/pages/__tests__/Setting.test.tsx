// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import Settings from "../Setting";
import { OWNER_FACEBOOK_URL } from "@/lib/contact";

let authToken: string | null = null;
const mockLogout = vi.fn();

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (s: { token: string | null; logout: () => void }) => unknown) =>
    selector({ token: authToken, logout: mockLogout }),
}));

let language: "en" | "th" = "en";

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th"; setLanguage: (l: string) => void }) => unknown) =>
    selector({ language, setLanguage: vi.fn() }),
}));

vi.mock("@/stores/theme.store", () => ({
  useThemeStore: () => ({ theme: "light" }),
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/components/editor/extensions/PersonalityPicker", () => ({
  default: () => <div data-testid="personality-picker" />,
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderSettings() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
  });
  return container!;
}

function clickButtonWithText(text: string) {
  const btn = Array.from(document.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(text),
  );
  act(() => {
    btn?.click();
  });
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
  document.body.innerHTML = "";
});

beforeEach(() => {
  language = "en";
  authToken = null;
  mockNavigate.mockReset();
  mockLogout.mockReset();
  window.localStorage.clear();
  document.documentElement.style.fontSize = "";
});

describe("Settings page", () => {
  it("dead rows are gone for anonymous users", () => {
    const el = renderSettings();
    const text = el.textContent ?? "";
    expect(text).not.toContain("Notifications");
    expect(text).not.toContain("Push & email alerts");
    expect(text).not.toContain("Theme, font size, display");
    expect(text).not.toContain("Privacy & Security");
    expect(text).not.toContain("Delete account");
  });

  it("anonymous sees only working rows", () => {
    const el = renderSettings();
    const text = el.textContent ?? "";
    expect(text).not.toContain("Log out");
    expect(text).not.toContain("Password");
    expect(text).toContain("Help & Support");
    expect(text).toContain("Font size");
    expect(el.querySelector('[data-testid="theme-toggle"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="personality-picker"]')).not.toBeNull();
    expect(text).toContain("English");
    expect(text).toContain("Thai");
  });

  it("logged-in rows include Password and Log out", () => {
    authToken = "tok";
    const el = renderSettings();
    const text = el.textContent ?? "";
    expect(text).toContain("Password");
    expect(text).toContain("Log out");

    const passwordBtn = Array.from(el.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Password"),
    );
    act(() => {
      passwordBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/change-password");
  });

  it("font size applies and persists", () => {
    renderSettings();
    clickButtonWithText("Large");
    expect(document.documentElement.style.fontSize).toBe("112.5%");
    expect(window.localStorage.getItem("app-font-size")).toBe("large");

    clickButtonWithText("Normal");
    expect(document.documentElement.style.fontSize).toBe("");
  });

  it("help popup opens with contact link", () => {
    renderSettings();
    clickButtonWithText("Help & Support");

    const bodyText = document.body.textContent ?? "";
    expect(bodyText).toContain("Message me on Facebook");
    expect(bodyText).toContain("built and run for free by one person");

    const fbLink = document.body.querySelector(
      `a[href="${OWNER_FACEBOOK_URL}"]`,
    );
    expect(fbLink).not.toBeNull();

    const statusLink = document.body.querySelector('a[href="/status"]');
    expect(statusLink).not.toBeNull();
  });

  it("renders Thai copy when language is Thai", () => {
    language = "th";
    const el = renderSettings();
    const text = el.textContent ?? "";
    expect(text).toContain("ตั้งค่า");
    expect(text).toContain("ขนาดตัวอักษร");
    expect(text).toContain("ช่วยเหลือและสนับสนุน");
  });

  it("logout flow calls logout and navigates to explore", () => {
    authToken = "tok";
    renderSettings();
    clickButtonWithText("Log out");
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/explore", { replace: true });
  });
});
