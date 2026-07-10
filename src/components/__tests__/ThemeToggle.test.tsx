// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { ThemeToggle } from "../ThemeToggle";

let language: "en" | "th" = "en";
let theme: "light" | "dark" = "dark";

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language }),
}));

vi.mock("@/stores/theme.store", () => ({
  useThemeStore: (
    selector?: (s: {
      theme: "light" | "dark";
      toggleTheme: () => void;
    }) => unknown,
  ) => {
    const state = {
      theme,
      toggleTheme: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
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
  language = "en";
  theme = "dark";
  container?.remove();
  container = null;
  root = null;
});

describe("ThemeToggle", () => {
  it("shows English labels in light mode", () => {
    theme = "light";
    const el = render(<ThemeToggle />);
    expect(el.textContent).toContain("Dark mode");
  });

  it("shows Thai labels when language is Thai", () => {
    language = "th";
    theme = "dark";
    const el = render(<ThemeToggle />);
    expect(el.textContent).toContain("โหมดสว่าง");
  });

  it("hides label text in compact mode", () => {
    theme = "dark";
    const el = render(<ThemeToggle compact />);
    expect(el.textContent).not.toContain("Light mode");
    expect(el.textContent).not.toContain("โหมดสว่าง");
  });
});
