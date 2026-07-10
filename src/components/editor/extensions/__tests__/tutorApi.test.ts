import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { post: mockPost },
}));

import {
  AiUnavailableError,
  callTutor,
  feedbackThreadToClientThread,
  qaHistoryToClientThread,
  type TutorRequest,
} from "../tutorApi";

const baseRequest: TutorRequest = {
  contentId: "abc123",
  blockId: "q-1",
  mode: "followup",
  message: "สวัสดี",
};

beforeEach(() => {
  mockPost.mockReset();
});

describe("callTutor", () => {
  it("posts the request to /chat/tutor and returns the parsed response", async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        reply: "  หวัดดี!  ",
        suggestions: ["ถามต่อ 1", "ถามต่อ 2"],
        sessionId: "sess-1",
      },
    });
    const result = await callTutor(baseRequest);
    expect(mockPost).toHaveBeenCalledWith("/chat/tutor", baseRequest);
    expect(result).toEqual({
      reply: "หวัดดี!",
      suggestions: ["ถามต่อ 1", "ถามต่อ 2"],
      sessionId: "sess-1",
    });
  });

  it("normalizes missing suggestions/sessionId", async () => {
    mockPost.mockResolvedValueOnce({ data: { reply: "ok" } });
    const result = await callTutor(baseRequest);
    expect(result).toEqual({ reply: "ok", suggestions: [], sessionId: null });
  });

  it("throws AiUnavailableError when reply is empty", async () => {
    mockPost.mockResolvedValueOnce({ data: { reply: "   " } });
    await expect(callTutor(baseRequest)).rejects.toThrow(AiUnavailableError);
  });

  it("throws AiUnavailableError on axios rejection", async () => {
    mockPost.mockRejectedValueOnce(new Error("network"));
    await expect(callTutor(baseRequest)).rejects.toThrow(AiUnavailableError);
  });

  it("throws AiUnavailableError when contentId is missing (no garbage requests)", async () => {
    await expect(
      callTutor({ ...baseRequest, contentId: "" }),
    ).rejects.toThrow(AiUnavailableError);
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe("feedbackThreadToClientThread", () => {
  it("prepends original exchange and renames ai → tutor", () => {
    const result = feedbackThreadToClientThread({
      originalAnswer: "น้ำ | CO2",
      initialFeedback: "เยี่ยมเลย!",
      thread: [
        { role: "student", text: "ทำไมต้องมี CO2?", createdAt: "2026-07-10" },
        { role: "ai", text: "เพราะเป็นวัตถุดิบ", createdAt: "2026-07-10" },
      ],
    });
    expect(result).toEqual([
      { role: "student", text: "น้ำ | CO2" },
      { role: "tutor", text: "เยี่ยมเลย!" },
      { role: "student", text: "ทำไมต้องมี CO2?", createdAt: "2026-07-10" },
      { role: "tutor", text: "เพราะเป็นวัตถุดิบ", createdAt: "2026-07-10" },
    ]);
  });

  it("skips empty original answer/feedback and blank messages", () => {
    const result = feedbackThreadToClientThread({
      originalAnswer: "  ",
      initialFeedback: undefined,
      thread: [
        { role: "student", text: "" },
        { role: "ai", text: "ตอบได้เลย" },
      ],
    });
    expect(result).toEqual([{ role: "tutor", text: "ตอบได้เลย" }]);
  });
});

describe("qaHistoryToClientThread", () => {
  it("flattens question/answer pairs into student/tutor entries", () => {
    const result = qaHistoryToClientThread([
      { question: "คืออะไร?", answer: "คือ...", createdAt: "2026-07-10" },
      { question: "แล้วไงต่อ?", answer: "ต่อมา..." },
    ]);
    expect(result).toEqual([
      { role: "student", text: "คืออะไร?", createdAt: "2026-07-10" },
      { role: "tutor", text: "คือ...", createdAt: "2026-07-10" },
      { role: "student", text: "แล้วไงต่อ?", createdAt: undefined },
      { role: "tutor", text: "ต่อมา...", createdAt: undefined },
    ]);
  });

  it("skips blank questions or answers (pending entries)", () => {
    const result = qaHistoryToClientThread([
      { question: "ถามไว้", answer: "" },
    ]);
    expect(result).toEqual([
      { role: "student", text: "ถามไว้", createdAt: undefined },
    ]);
  });
});
