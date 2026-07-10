// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { TopNav } from "../TopNav";

let authToken: string | null = "fake-token";

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (s: { token: string | null }) => unknown) =>
    selector({ token: authToken }),
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div />,
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

afterEach(() => {
  container?.remove();
  container = null;
  root = null;
});

describe("TopNav", () => {
  it("logged-in render contains exactly one Settings item", () => {
    authToken = "fake-token";
    const el = render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>,
    );

    const settings = Array.from(el.querySelectorAll("span")).filter(
      (s) => s.textContent === "Settings",
    );
    expect(settings).toHaveLength(1);
    expect(el.textContent).toContain("History");
    expect(el.textContent).toContain("Profile");
  });

  it("logged-out contains no auth-only items", () => {
    authToken = null;
    const el = render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>,
    );

    expect(el.textContent).not.toContain("History");
    expect(el.textContent).not.toContain("Profile");
    expect(el.textContent).toContain("Settings");
  });
});
