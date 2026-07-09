import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { post: mockPost },
}));

import {
  requestQuestionFeedback,
  requestWriteEvaluation,
} from "../questionFeedbackApi";

const FALLBACK_FEEDBACK =
  "ขอบคุณที่พยายามตอบนะ ลองดูส่วนที่พลาดทีละจุด แล้วค่อยลองใหม่อีกครั้ง เดี๋ยวจะดีขึ้นแน่นอน";
const FALLBACK_WRITE =
  "คำตอบนี้มีแนวคิดที่น่าสนใจแล้วนะ ลองขยายเหตุผลให้ชัดขึ้นอีกนิด โดยอธิบายว่าแต่ละประเด็นเชื่อมกับคำถามอย่างไร แล้วสรุปเป็นคำตอบสุดท้ายอีกครั้ง";

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

  it("returns fallback when feedback is empty", async () => {
    mockPost.mockResolvedValueOnce({ data: { feedback: "   " } });
    const result = await requestQuestionFeedback(feedbackPayload);
    expect(result).toBe(FALLBACK_FEEDBACK);
  });

  it("returns fallback when feedback is missing", async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    const result = await requestQuestionFeedback(feedbackPayload);
    expect(result).toBe(FALLBACK_FEEDBACK);
  });

  it("returns fallback on axios rejection", async () => {
    mockPost.mockRejectedValueOnce(new Error("network"));
    const result = await requestQuestionFeedback(feedbackPayload);
    expect(result).toBe(FALLBACK_FEEDBACK);
  });
});

describe("requestWriteEvaluation", () => {
  it("returns trimmed feedback on success", async () => {
    mockPost.mockResolvedValueOnce({ data: { feedback: "  ดีมาก  " } });
    const result = await requestWriteEvaluation(writePayload);
    expect(result).toBe("ดีมาก");
  });

  it("returns fallback when feedback is empty", async () => {
    mockPost.mockResolvedValueOnce({ data: { feedback: "" } });
    const result = await requestWriteEvaluation(writePayload);
    expect(result).toBe(FALLBACK_WRITE);
  });

  it("returns fallback on axios rejection", async () => {
    mockPost.mockRejectedValueOnce(new Error("timeout"));
    const result = await requestWriteEvaluation(writePayload);
    expect(result).toBe(FALLBACK_WRITE);
  });
});
