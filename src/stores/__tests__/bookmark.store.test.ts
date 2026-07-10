// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { useBookmarkStore } from "../bookmark.store";

beforeEach(() => {
  useBookmarkStore.setState({ ids: [] });
  localStorage.clear();
});

describe("bookmark.store", () => {
  it("toggle adds and removes ids", () => {
    const { toggle, has } = useBookmarkStore.getState();
    expect(has("lesson-1")).toBe(false);

    toggle("lesson-1");
    expect(useBookmarkStore.getState().ids).toEqual(["lesson-1"]);
    expect(has("lesson-1")).toBe(true);

    toggle("lesson-1");
    expect(useBookmarkStore.getState().ids).toEqual([]);
  });

  it("state round-trips through persisted storage shape", () => {
    useBookmarkStore.setState({ ids: ["a", "b"] });
    const raw = localStorage.getItem("bookmark-storage");
    expect(raw).toBeTruthy();

    const parsed = JSON.parse(raw!);
    expect(parsed.state.ids).toEqual(["a", "b"]);

    useBookmarkStore.setState({ ids: [] });
    useBookmarkStore.setState(parsed.state);
    expect(useBookmarkStore.getState().ids).toEqual(["a", "b"]);
  });
});
