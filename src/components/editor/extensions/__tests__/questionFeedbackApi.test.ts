import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { post: mockPost },
}));

import {
  AiUnavailableError,
  requestQuestionFeedback,
  requestWriteEvaluation,
} from "../questionFeedbackApi";

const feedbackPayload = {
  question: "q",
  correctAnswer: "c",
  userAnswer: "u",
  evaluationLevel: "almost" as const,
  accuracyPercent: 70,
};

const writePayload = {
  question: "q",
  guideAnswer: "g",
  studentAnswer: "s",
};

beforeEach(() => {
  mockPost.mockReset();
});

describe("requestQuestionFeedback", () => {
  it("returns trimmed feedback on success", async () => {
    mockPost.mockResolvedValueOnce({ data: { feedback: "  สวัสดี  " } });
    const result = await requestQuestionFeedback(feedbackPayload);
    expect(result).toBe("สวัสดี");
  });

  it("throws AiUnavailableError when feedback is empty", async () => {
    mockPost.mockResolvedValueOnce({ data: { feedback: "   " } });
    await expect(requestQuestionFeedback(feedbackPayload)).rejects.toThrow(
      AiUnavailableError,
    );
  });

  it("throws AiUnavailableError when feedback is missing", async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    await expect(requestQuestionFeedback(feedbackPayload)).rejects.toThrow(
      AiUnavailableError,
    );
  });

  it("throws AiUnavailableError on axios rejection", async () => {
    mockPost.mockRejectedValueOnce(new Error("network"));
    await expect(requestQuestionFeedback(feedbackPayload)).rejects.toThrow(
      AiUnavailableError,
    );
  });
});

describe("requestWriteEvaluation", () => {
  it("returns trimmed feedback on success", async () => {
    mockPost.mockResolvedValueOnce({ data: { feedback: "  ดีมาก  " } });
    const result = await requestWriteEvaluation(writePayload);
    expect(result).toBe("ดีมาก");
  });

  it("throws AiUnavailableError when feedback is empty", async () => {
    mockPost.mockResolvedValueOnce({ data: { feedback: "" } });
    await expect(requestWriteEvaluation(writePayload)).rejects.toThrow(
      AiUnavailableError,
    );
  });

  it("throws AiUnavailableError on axios rejection", async () => {
    mockPost.mockRejectedValueOnce(new Error("timeout"));
    await expect(requestWriteEvaluation(writePayload)).rejects.toThrow(
      AiUnavailableError,
    );
  });
});
