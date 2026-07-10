import api from "@/lib/axios";
import type { QuestionFeedbackMode } from "./questionMode";

export class AiUnavailableError extends Error {
  constructor() {
    super("AI unavailable");
    this.name = "AiUnavailableError";
  }
}

export interface FeedbackRequestPayload {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  evaluationLevel: "correct" | "almost" | "incorrect";
  accuracyPercent: number;
  diagnostics?: string;
  feedbackMode?: QuestionFeedbackMode;
}

export interface WriteEvaluationPayload {
  question: string;
  guideAnswer: string;
  studentAnswer: string;
  feedbackMode?: QuestionFeedbackMode;
}

export interface FeedbackFollowupMessage {
  role: "student" | "ai";
  text: string;
}

export interface FeedbackFollowupPayload {
  topic: string;
  studentAnswer: string;
  initialFeedback: string;
  followupQuestion: string;
  thread: FeedbackFollowupMessage[];
  expectedAnswer?: string;
  feedbackMode?: QuestionFeedbackMode;
}

export async function requestQuestionFeedback(
  payload: FeedbackRequestPayload,
): Promise<string> {
  try {
    const response = await api.post<{ feedback?: string }>(
      "/chat/feedback",
      payload,
    );
    const feedback = response.data?.feedback?.trim();
    if (!feedback) throw new AiUnavailableError();
    return feedback;
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    throw new AiUnavailableError();
  }
}

export async function requestWriteEvaluation(
  payload: WriteEvaluationPayload,
): Promise<string> {
  try {
    const response = await api.post<{ feedback?: string }>(
      "/chat/write-evaluate",
      payload,
    );
    const feedback = response.data?.feedback?.trim();
    if (!feedback) throw new AiUnavailableError();
    return feedback;
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    throw new AiUnavailableError();
  }
}

export async function requestFeedbackFollowup(
  payload: FeedbackFollowupPayload,
): Promise<string> {
  const threadContext = payload.thread
    .slice(-10)
    .map((entry) => `${entry.role === "student" ? "Student" : "AI"}: ${entry.text}`)
    .join("\n");

  return requestQuestionFeedback({
    question: payload.topic || "Feedback follow-up",
    correctAnswer: payload.expectedAnswer?.trim() || "(Open-ended response accepted)",
    userAnswer: [
      `Original student answer: ${payload.studentAnswer || "(none)"}`,
      `Initial AI feedback: ${payload.initialFeedback || "(none)"}`,
      `Student follow-up: ${payload.followupQuestion}`,
    ].join("\n"),
    evaluationLevel: "almost",
    accuracyPercent: 0,
    diagnostics: [
      "Mode: follow-up coaching conversation about prior feedback.",
      "Be concise and conversational. Build on previous AI feedback.",
      "If student asks for clarification, explain step-by-step with one practical next action.",
      threadContext ? `Recent thread:\n${threadContext}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    feedbackMode: payload.feedbackMode,
  });
}
