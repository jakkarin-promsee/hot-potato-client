// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import Profile from "../Profile";

const { profileState, mockFetchProfile, mockSaveProfile } = vi.hoisted(() => ({
  mockFetchProfile: vi.fn(),
  mockSaveProfile: vi.fn(),
  profileState: {
    profile: { avatar: "", bio: "Existing bio", nickname: "Nick" },
    isLoading: false,
    isSaving: false,
    error: null,
    fetchProfile: vi.fn(),
    saveProfile: vi.fn(),
  },
}));

profileState.fetchProfile = mockFetchProfile;
profileState.saveProfile = mockSaveProfile;

vi.mock("@/stores/profile.store", () => ({
  useProfileStore: (selector?: (s: typeof profileState) => unknown) =>
    selector ? selector(profileState) : profileState,
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector?: (s: { user: { id: string; name: string; email: string; role: string } }) => unknown) => {
    const state = {
      user: { id: "u1", name: "Alice", email: "alice@test.local", role: "learner" },
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/stores/theme.store", () => ({
  useThemeStore: () => ({ theme: "light" }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

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

function setInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  container?.remove();
  container = null;
  root = null;
});

beforeEach(() => {
  mockFetchProfile.mockReset();
  mockSaveProfile.mockResolvedValue(undefined);
});

describe("Profile page", () => {
  it("populates fields from profile state", () => {
    const el = render(<Profile />);
    expect((el.querySelector("#name") as HTMLInputElement)?.value).toBe("Alice");
    expect((el.querySelector("#nickname") as HTMLInputElement)?.value).toBe("Nick");
    expect((el.querySelector("#bio") as HTMLTextAreaElement)?.value).toBe("Existing bio");
    expect(el.textContent).toContain("alice@test.local");
  });

  it("Save calls saveProfile with only changed fields", async () => {
    const el = render(<Profile />);
    const bio = el.querySelector("#bio") as HTMLTextAreaElement;
    const saveBtn = Array.from(el.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Save changes"),
    );

    await act(async () => {
      setInputValue(bio, "Updated bio");
      saveBtn?.click();
    });

    expect(mockSaveProfile).toHaveBeenCalledWith({ bio: "Updated bio" });
  });
});
