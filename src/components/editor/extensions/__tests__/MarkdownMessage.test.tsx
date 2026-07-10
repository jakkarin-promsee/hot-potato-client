// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import MarkdownMessage from "../MarkdownMessage";

let container: HTMLDivElement | null = null;

function render(text: string): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<MarkdownMessage text={text} />);
  });
  return container;
}

afterEach(() => {
  container?.remove();
  container = null;
});

describe("MarkdownMessage", () => {
  it("renders **bold** as <strong>, not raw asterisks", () => {
    const el = render("นี่คือ **คำสำคัญ** ในประโยค");
    const strong = el.querySelector("strong");
    expect(strong?.textContent).toBe("คำสำคัญ");
    expect(el.textContent).not.toContain("**");
  });

  it("renders lists and inline code", () => {
    const el = render("- ข้อแรก\n- ข้อสอง\n\nลอง `x = 1` ดู");
    const items = el.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(el.querySelector("code")?.textContent).toBe("x = 1");
  });

  it("does not inject raw HTML or scripts", () => {
    const el = render('ทดสอบ <script>window.hacked = true</script> <img src="x" onerror="window.hacked=true">');
    expect(el.querySelector("script")).toBeNull();
    expect(el.querySelector("img")).toBeNull();
    expect((window as unknown as { hacked?: boolean }).hacked).toBeUndefined();
  });

  it("downgrades headings to bold paragraphs", () => {
    const el = render("# หัวข้อใหญ่\n\nเนื้อหา");
    expect(el.querySelector("h1")).toBeNull();
    const p = el.querySelector("p");
    expect(p?.textContent).toBe("หัวข้อใหญ่");
    expect(p?.className).toContain("font-semibold");
  });

  it("drops images and tables (unwraps disallowed content)", () => {
    const el = render("![alt](https://x/y.png)\n\n| a | b |\n| - | - |\n| 1 | 2 |");
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector("table")).toBeNull();
  });

  it("links open in a new tab with rel guard", () => {
    const el = render("[อ่านต่อ](https://example.com)");
    const a = el.querySelector("a");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toContain("noopener");
  });
});
