import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { post: mockPost, get: vi.fn() },
}));

import { callCreator, CreatorAiError } from "../creatorApi";

function axiosError(status: number, data: unknown = {}) {
  return Object.assign(new Error(`HTTP ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });
}

beforeEach(() => {
  mockPost.mockReset();
});

describe("callCreator", () => {
  it("posts { contentId, action, payload } to /creator/assist and unwraps result", async () => {
    mockPost.mockResolvedValueOnce({
      data: { result: { latex: "E=mc^2" } },
    });
    const result = await callCreator("content-1", "formula_latex", {
      formulaText: "E=mc^2",
      description: "สมการพลังงาน",
    });
    expect(result).toEqual({ latex: "E=mc^2" });
    expect(mockPost).toHaveBeenCalledWith("/creator/assist", {
      contentId: "content-1",
      action: "formula_latex",
      payload: { formulaText: "E=mc^2", description: "สมการพลังงาน" },
    });
  });

  it("throws BAD_REQUEST without calling the API when contentId is empty", async () => {
    await expect(
      callCreator("", "critic", {}),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("maps HTTP statuses to machine codes", async () => {
    mockPost.mockRejectedValueOnce(axiosError(403));
    await expect(
      callCreator("c1", "critic", {}),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    mockPost.mockRejectedValueOnce(axiosError(400));
    await expect(
      callCreator("c1", "critic", {}),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    mockPost.mockRejectedValueOnce(axiosError(404));
    await expect(
      callCreator("c1", "critic", {}),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("maps the server's AI_UNAVAILABLE code and network failures", async () => {
    mockPost.mockRejectedValueOnce(
      axiosError(500, { code: "AI_UNAVAILABLE" }),
    );
    await expect(
      callCreator("c1", "critic", {}),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });

    mockPost.mockRejectedValueOnce(new Error("network down"));
    await expect(
      callCreator("c1", "critic", {}),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });

  it("treats a missing result as AI_UNAVAILABLE", async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    const error = await callCreator("c1", "critic", {}).catch((e) => e);
    expect(error).toBeInstanceOf(CreatorAiError);
    expect(error.code).toBe("AI_UNAVAILABLE");
  });
});
