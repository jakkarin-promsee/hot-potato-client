// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { LanguageToggle } from "../LanguageToggle";

let language: "en" | "th" = "en";
const setLanguage = vi.fn((next: "en" | "th") => {
  language = next;
});

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (
    selector: (s: {
      language: "en" | "th";
      setLanguage: (next: "en" | "th") => void;
    }) => unknown,
  ) => selector({ language, setLanguage }),
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
  setLanguage.mockClear();
  container?.remove();
  container = null;
  root = null;
});

describe("LanguageToggle", () => {
  it("renders EN and TH buttons", () => {
    const el = render(<LanguageToggle compact />);
    const buttons = el.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.textContent).toBe("EN");
    expect(buttons[1]?.textContent).toBe("TH");
  });

  it("calls setLanguage when a button is clicked", async () => {
    const el = render(<LanguageToggle compact />);
    const thButton = el.querySelectorAll("button")[1]!;
    await act(async () => {
      thButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(setLanguage).toHaveBeenCalledWith("th");
  });
});
