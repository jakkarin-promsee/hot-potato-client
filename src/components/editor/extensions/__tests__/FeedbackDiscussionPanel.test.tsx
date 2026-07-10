// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import FeedbackDiscussionPanel, {
  type FeedbackThreadMessage,
} from "../FeedbackDiscussionPanel";
import SuggestionChips from "../SuggestionChips";

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language: "en" }),
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(ui: React.ReactElement): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

afterEach(() => {
  container?.remove();
  container = null;
  root = null;
});

const messages: FeedbackThreadMessage[] = [
  { role: "student", text: "ทำไมถึงเป็นแบบนั้น?", createdAt: "2026-07-10T00:00:00Z" },
  { role: "ai", text: "เพราะว่า **แสง** คือพลังงานไง", createdAt: "2026-07-10T00:00:01Z" },
];

describe("FeedbackDiscussionPanel (0.C de-nest)", () => {
  it("has a single flat section — no nested border boxes around the thread", () => {
    const el = render(
      <FeedbackDiscussionPanel
        messages={messages}
        open
        loading={false}
        onToggle={() => {}}
        onSend={() => {}}
      />,
    );
    const panelRoot = el.firstElementChild as HTMLElement;
    // Flat: hairline separator + full-bleed negative margins, no box wrapper
    expect(panelRoot.className).toContain("border-t");
    expect(panelRoot.className).toContain("-mx-4");
    expect(panelRoot.className).not.toContain("rounded-lg");
    // The messages list itself must not be another bordered box
    const bubbles = el.querySelectorAll("p, div");
    const messagesList = el.querySelector("[class*='overflow-y-auto']");
    expect(messagesList).not.toBeNull();
    expect((messagesList as HTMLElement).className).not.toContain("border");
    expect((messagesList as HTMLElement).className).not.toContain("bg-gray-50");
    expect(bubbles.length).toBeGreaterThan(0);
  });

  it("bubbles use max-w-[85%] of the full width", () => {
    const el = render(
      <FeedbackDiscussionPanel
        messages={messages}
        open
        loading={false}
        onToggle={() => {}}
        onSend={() => {}}
      />,
    );
    const student = Array.from(el.querySelectorAll("p")).find((p) =>
      p.textContent?.includes("ทำไมถึงเป็นแบบนั้น?"),
    );
    expect(student?.className).toContain("max-w-[85%]");
  });

  it("AI bubble renders markdown (bold), student stays plain", () => {
    const el = render(
      <FeedbackDiscussionPanel
        messages={messages}
        open
        loading={false}
        onToggle={() => {}}
        onSend={() => {}}
      />,
    );
    expect(el.querySelector("strong")?.textContent).toBe("แสง");
  });

  it("renders suggestion chips and forwards taps to onSend", () => {
    const onSend = vi.fn();
    const el = render(
      <FeedbackDiscussionPanel
        messages={messages}
        open
        loading={false}
        onToggle={() => {}}
        onSend={onSend}
        suggestions={["แล้วถ้าไม่มีแสงล่ะ?", "ขอตัวอย่างหน่อย"]}
      />,
    );
    const chips = el.querySelectorAll("[data-testid='suggestion-chips'] button");
    expect(chips).toHaveLength(2);
    act(() => {
      (chips[0] as HTMLButtonElement).click();
    });
    expect(onSend).toHaveBeenCalledWith("แล้วถ้าไม่มีแสงล่ะ?");
  });

  it("hides chips while loading and shows a typing indicator", () => {
    const el = render(
      <FeedbackDiscussionPanel
        messages={messages}
        open
        loading
        onToggle={() => {}}
        onSend={() => {}}
        suggestions={["ชิปที่ไม่ควรเห็น"]}
      />,
    );
    expect(el.querySelector("[data-testid='suggestion-chips']")).toBeNull();
    // i18n falls back to English in the test environment
    expect(el.textContent).toContain("AI is typing...");
  });

  it("send button meets the 44px touch height", () => {
    const el = render(
      <FeedbackDiscussionPanel
        messages={messages}
        open
        loading={false}
        onToggle={() => {}}
        onSend={() => {}}
      />,
    );
    const send = Array.from(el.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Submit"),
    );
    expect(send).toBeDefined();
    expect(send?.className).toContain("h-11");
  });
});

describe("SuggestionChips", () => {
  it("renders nothing for empty or blank suggestions", () => {
    const el = render(
      <SuggestionChips suggestions={["  ", ""]} onPick={() => {}} />,
    );
    expect(el.querySelector("[data-testid='suggestion-chips']")).toBeNull();
  });

  it("fires onPick with the chip text and meets 44px height", () => {
    const onPick = vi.fn();
    const el = render(
      <SuggestionChips suggestions={["ถามต่อเรื่องนี้"]} onPick={onPick} />,
    );
    const chip = el.querySelector(
      "[data-testid='suggestion-chips'] button",
    ) as HTMLButtonElement;
    expect(chip.className).toContain("min-h-11");
    act(() => {
      chip.click();
    });
    expect(onPick).toHaveBeenCalledWith("ถามต่อเรื่องนี้");
  });

  it("uses horizontal scroll layout when layout is scroll", () => {
    const el = render(
      <SuggestionChips
        suggestions={["chip one", "chip two"]}
        onPick={() => {}}
        layout="scroll"
      />,
    );
    const row = el.querySelector("[data-testid='suggestion-chips']")!;
    expect(row.getAttribute("data-layout")).toBe("scroll");
    expect(row.className).toContain("overflow-x-auto");
    expect(row.className).toContain("flex-nowrap");
    const chips = el.querySelectorAll("[data-testid='suggestion-chips'] button");
    chips.forEach((chip) => {
      expect(chip.className).toContain("shrink-0");
    });
  });
});
