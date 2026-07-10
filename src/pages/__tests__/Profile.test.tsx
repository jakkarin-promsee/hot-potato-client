// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
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

let language: "en" | "th" = "en";

profileState.fetchProfile = mockFetchProfile;
profileState.saveProfile = mockSaveProfile;

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language }),
}));

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

vi.mock("@/stores/tutorPersonality.store", () => ({
  TUTOR_PERSONALITY_CATALOG: [
    { id: "default", labelTh: "น้องมันฝรั่งคลาสสิก", labelEn: "Classic", emoji: "🥔" },
    { id: "gentle", labelTh: "สุภาพ อ่อนโยน", labelEn: "Gentle", emoji: "🌷" },
  ],
  useTutorPersonalityStore: (selector: (s: { personality: string }) => unknown) =>
    selector({ personality: "gentle" }),
}));

vi.mock("@/components/TutorMemoryCard", () => ({
  TutorMemoryCard: () => <div data-testid="tutor-memory-card" />,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

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
  language = "en";
  mockFetchProfile.mockReset();
  mockSaveProfile.mockResolvedValue(undefined);
});

describe("Profile page", () => {
  it("populates fields from profile state", () => {
    const el = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect((el.querySelector("#name") as HTMLInputElement)?.value).toBe("Alice");
    expect((el.querySelector("#nickname") as HTMLInputElement)?.value).toBe("Nick");
    expect((el.querySelector("#bio") as HTMLTextAreaElement)?.value).toBe("Existing bio");
    expect(el.textContent).toContain("alice@test.local");
  });

  it("Save calls saveProfile with only changed fields", async () => {
    const el = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
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

  it("renders Thai copy when language is Thai", () => {
    language = "th";
    const el = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(el.textContent).toContain("แตะเพื่อเปลี่ยนรูปโปรไฟล์");
    expect(el.textContent).toContain("ชื่อที่แสดง");
    expect(el.textContent).toContain("เปลี่ยนรหัสผ่าน");
    expect(el.textContent).toContain("บันทึกการเปลี่ยนแปลง");
  });

  it("does not render the Theme row", () => {
    const el = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    const text = el.textContent ?? "";
    expect(text).not.toContain("Theme");
    expect(text).not.toContain("ธีม");
    expect(el.querySelector('[data-testid="theme-toggle"]')).toBeNull();
  });

  it("shows personality shortcut with link to settings", () => {
    const el = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(el.textContent).toContain("Gentle");
    expect(el.textContent).toContain("🌷");
    const settingsLink = el.querySelector('a[href="/settings"]');
    expect(settingsLink).not.toBeNull();
  });

  it("renders the tutor memory card stub", () => {
    const el = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(el.querySelector('[data-testid="tutor-memory-card"]')).not.toBeNull();
  });
});
