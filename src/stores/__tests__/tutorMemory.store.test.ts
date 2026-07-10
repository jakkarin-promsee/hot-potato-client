// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGet, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { get: mockGet, delete: mockDelete },
}));

import {
  useTutorMemoryStore,
  isMemoryEmpty,
} from "../tutorMemory.store";

beforeEach(() => {
  useTutorMemoryStore.setState({
    memory: null,
    isLoading: false,
    isClearing: false,
    error: null,
  });
  mockGet.mockReset();
  mockDelete.mockReset();
});

describe("tutorMemory.store", () => {
  it("normalizes the raw doc and strips internal fields", async () => {
    mockGet.mockResolvedValue({
      data: {
        interests: ["math"],
        strengths: ["logic"],
        growth_areas: ["writing"],
        preferences: ["warm tone"],
        recent_topics: [
          {
            content_id: "c1",
            summary: "Fractions",
            updatedAt: "2026-01-01",
          },
        ],
        _id: "mem1",
        user_id: "u1",
        tutor_personality: "gentle",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      },
    });

    await useTutorMemoryStore.getState().fetchMemory();

    const { memory } = useTutorMemoryStore.getState();
    expect(memory).not.toBeNull();
    expect(memory?.interests).toEqual(["math"]);
    expect(memory?.strengths).toEqual(["logic"]);
    expect(memory?.growth_areas).toEqual(["writing"]);
    expect(memory?.preferences).toEqual(["warm tone"]);
    expect(memory?.recent_topics).toHaveLength(1);
    expect(memory).not.toHaveProperty("tutor_personality");
    expect(memory).not.toHaveProperty("user_id");
    expect(JSON.stringify(memory)).not.toContain("user_id");
  });

  it("handles empty server response", async () => {
    mockGet.mockResolvedValue({ data: {} });

    await useTutorMemoryStore.getState().fetchMemory();

    const { memory } = useTutorMemoryStore.getState();
    expect(memory).toEqual({
      interests: [],
      strengths: [],
      growth_areas: [],
      preferences: [],
      recent_topics: [],
    });
    expect(isMemoryEmpty(memory!)).toBe(true);
  });

  it("filters recent topics with blank summaries", async () => {
    mockGet.mockResolvedValue({
      data: {
        recent_topics: [
          { content_id: "c1", summary: "Real topic", updatedAt: "2026-01-01" },
          { content_id: "c2", summary: "", updatedAt: "2026-01-02" },
        ],
      },
    });

    await useTutorMemoryStore.getState().fetchMemory();

    const { memory } = useTutorMemoryStore.getState();
    expect(memory?.recent_topics).toHaveLength(1);
    expect(memory?.recent_topics[0].summary).toBe("Real topic");
  });

  it("sets load_failed on fetch error", async () => {
    mockGet.mockRejectedValue(new Error("network"));

    await useTutorMemoryStore.getState().fetchMemory();

    const state = useTutorMemoryStore.getState();
    expect(state.error).toBe("load_failed");
    expect(state.memory).toBeNull();
  });

  it("clearMemory deletes and resets memory", async () => {
    useTutorMemoryStore.setState({
      memory: {
        interests: ["math"],
        strengths: [],
        growth_areas: [],
        preferences: [],
        recent_topics: [],
      },
    });
    mockDelete.mockResolvedValue({ data: { message: "Memory cleared" } });

    await useTutorMemoryStore.getState().clearMemory();

    expect(mockDelete).toHaveBeenCalledWith("/chat/memory");
    const { memory, isClearing } = useTutorMemoryStore.getState();
    expect(isMemoryEmpty(memory!)).toBe(true);
    expect(isClearing).toBe(false);
  });

  it("clearMemory sets clear_failed and rejects on error", async () => {
    const previousMemory = {
      interests: ["math"],
      strengths: [],
      growth_areas: [],
      preferences: [],
      recent_topics: [],
    };
    useTutorMemoryStore.setState({ memory: previousMemory });
    mockDelete.mockRejectedValue(new Error("network"));

    await expect(
      useTutorMemoryStore.getState().clearMemory(),
    ).rejects.toThrow("clear_failed");

    const state = useTutorMemoryStore.getState();
    expect(state.error).toBe("clear_failed");
    expect(state.memory).toEqual(previousMemory);
  });
});
