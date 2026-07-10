// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  window.localStorage.clear();
  document.documentElement.style.fontSize = "";
});

describe("appearance.store", () => {
  it("defaults to normal with no inline font-size", async () => {
    const { useAppearanceStore } = await import("../appearance.store");
    expect(useAppearanceStore.getState().fontSize).toBe("normal");
    expect(document.documentElement.style.fontSize).toBe("");
  });

  it("setFontSize applies the css size and persists", async () => {
    const { useAppearanceStore } = await import("../appearance.store");
    useAppearanceStore.getState().setFontSize("xlarge");
    expect(document.documentElement.style.fontSize).toBe("125%");
    expect(window.localStorage.getItem("app-font-size")).toBe("xlarge");
  });

  it("re-applies a persisted size at module load", async () => {
    window.localStorage.setItem("app-font-size", "large");
    const { useAppearanceStore } = await import("../appearance.store");
    expect(useAppearanceStore.getState().fontSize).toBe("large");
    expect(document.documentElement.style.fontSize).toBe("112.5%");
  });

  it("falls back to normal on a garbage persisted value", async () => {
    window.localStorage.setItem("app-font-size", "gigantic");
    const { useAppearanceStore } = await import("../appearance.store");
    expect(useAppearanceStore.getState().fontSize).toBe("normal");
    expect(document.documentElement.style.fontSize).toBe("");
  });

  it("returning to normal clears the inline style", async () => {
    const { useAppearanceStore } = await import("../appearance.store");
    useAppearanceStore.getState().setFontSize("small");
    expect(document.documentElement.style.fontSize).toBe("87.5%");
    useAppearanceStore.getState().setFontSize("normal");
    expect(document.documentElement.style.fontSize).toBe("");
    expect(window.localStorage.getItem("app-font-size")).toBe("normal");
  });
});
