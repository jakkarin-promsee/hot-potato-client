// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import Status from "../Status";
import type { AllStatusResponse } from "@/stores/status.store";

const { statusState, mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  statusState: {
    data: null as unknown,
    loading: false,
    error: null as string | null,
    lastFetched: null as Date | null,
    fetch: vi.fn(),
    reset: vi.fn(),
  },
}));
statusState.fetch = mockFetch;

let language: "en" | "th" = "en";

vi.mock("@/stores/language.store", () => ({
  useLanguageStore: (selector: (s: { language: "en" | "th" }) => unknown) =>
    selector({ language }),
}));

vi.mock("@/stores/status.store", () => ({
  useStatusStore: (selector?: (s: typeof statusState) => unknown) =>
    selector ? selector(statusState) : statusState,
}));

function makeData(
  checksOverrides: Partial<AllStatusResponse["checks"]> = {},
): AllStatusResponse {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    checks: {
      server: { status: "ok", uptime: "0h 5m 3s", environment: "test" },
      database: { status: "ok", connection: "connected", ready_state: 1 },
      env: {
        status: "ok",
        variables: [
          { key: "MONGO_URI", loaded: true },
          { key: "JWT_SECRET", loaded: true },
        ],
      },
      ...checksOverrides,
    },
  } as AllStatusResponse;
}

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
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

beforeEach(() => {
  language = "en";
  statusState.data = null;
  statusState.loading = false;
  statusState.error = null;
  statusState.lastFetched = null;
  mockFetch.mockReset();
});

describe("Status page", () => {
  it("backward compatible: renders without ai/errors cards", () => {
    statusState.data = makeData();
    const el = render(<Status />);
    expect(el.textContent).toContain("Server");
    expect(el.textContent).toContain("Server Environment");
    expect(el.textContent).toContain("Client Environment");
    expect(el.textContent).not.toContain("AI Tutor");
    expect(el.textContent).not.toContain("Recent Errors");
  });

  it("AI ok: shows AI Tutor card with relative time", () => {
    statusState.data = makeData({
      ai: {
        status: "ok",
        last_success: new Date(Date.now() - 5 * 60000).toISOString(),
        last_failure: null,
      },
    });
    const el = render(<Status />);
    expect(el.textContent).toContain("AI Tutor");
    expect(el.textContent).toContain("5m ago");
    expect(el.textContent).toContain("Operational");
    expect(el.textContent).toContain("Last failure");
    expect(el.textContent).toContain("—");
  });

  it("AI degraded: shows Degraded badge", () => {
    statusState.data = makeData({
      ai: {
        status: "degraded",
        last_success: new Date(Date.now() - 60 * 60000).toISOString(),
        last_failure: new Date(Date.now() - 2 * 60000).toISOString(),
      },
    });
    const el = render(<Status />);
    expect(el.textContent).toContain("Degraded");
  });

  it("AI unknown: shows Standby and hint text", () => {
    statusState.data = makeData({
      ai: {
        status: "unknown",
        last_success: null,
        last_failure: null,
      },
    });
    const el = render(<Status />);
    expect(el.textContent).toContain("Standby");
    expect(el.textContent).toContain(
      "No AI calls since the last restart yet.",
    );
  });

  it("errors empty state in English and Thai", () => {
    statusState.data = makeData({
      errors: {
        count_since_boot: 0,
        last_error_at: null,
        since: new Date().toISOString(),
        recent: [],
      },
    });
    let el = render(<Status />);
    expect(el.textContent).toContain("No errors 🎉");

    language = "th";
    el = render(<Status />);
    expect(el.textContent).toContain("ไม่มีข้อผิดพลาด 🎉");
    expect(el.textContent).toContain("สถานะระบบ");
  });

  it("errors list shows entries with overflow indicator", () => {
    const recent = Array.from({ length: 8 }, (_, i) => ({
      time: new Date(Date.now() - i * 60000).toISOString(),
      method: "POST",
      route: "/api/chat/tutor",
      status: 502,
    }));
    statusState.data = makeData({
      errors: {
        count_since_boot: 8,
        last_error_at: recent[0].time,
        since: new Date().toISOString(),
        recent,
      },
    });
    const el = render(<Status />);
    expect(el.textContent).toContain("POST /api/chat/tutor");
    expect(el.textContent).toContain("502");
    expect(el.textContent).toContain("8");
    expect(el.textContent).toContain("+2");
  });
});
