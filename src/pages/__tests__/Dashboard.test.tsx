// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../Dashboard";

const mockDeleteContent = vi.fn();

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({
    user: { email: "teacher@test.local" },
    logout: vi.fn(),
  }),
}));

vi.mock("@/stores/content.store", () => ({
  useContentStore: () => ({
    contents: [
      {
        _id: "lesson-1",
        title: "My Lesson",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    isLoading: false,
    error: null,
    fetchMyContents: vi.fn(),
    searchContents: vi.fn(),
    createContent: vi.fn(),
    deleteContent: mockDeleteContent,
  }),
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
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
  document.body.innerHTML = "";
});

beforeEach(() => {
  mockDeleteContent.mockReset();
  mockDeleteContent.mockResolvedValue(undefined);
});

describe("Dashboard delete confirm", () => {
  it("opens dialog on delete click without calling deleteContent", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const deleteBtn = document.querySelector("[aria-label='Delete lesson']");
    await act(async () => {
      deleteBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("Delete lesson?");
    expect(mockDeleteContent).not.toHaveBeenCalled();
  });

  it("calls deleteContent with the right id on confirm", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const deleteBtn = document.querySelector("[aria-label='Delete lesson']");
    await act(async () => {
      deleteBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const confirmBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Delete",
    );
    await act(async () => {
      confirmBtn?.click();
    });

    expect(mockDeleteContent).toHaveBeenCalledWith("lesson-1");
  });
});
