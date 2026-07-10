import api from "@/lib/axios";
import type { QuestionFeedbackMode } from "./questionMode";

export class AiUnavailableError extends Error {
  constructor() {
    super("AI unavailable");
    this.name = "AiUnavailableError";
  }
}

export type TutorMode =
  | "free_chat"
  | "question_feedback"
  | "write_evaluation"
  | "followup";

export interface TutorThreadEntry {
  role: "student" | "tutor";
  text: string;
  createdAt?: string;
}

export interface TutorRequest {
  contentId: string;
  blockId: string;
  mode: TutorMode;
  message: string;
  clientThread?: TutorThreadEntry[];
  currentSection?: string;
  questionContext?: {
    question: string;
    guideAnswer?: string;
    evaluation?: {
      level: "correct" | "almost" | "incorrect" | "ai_judge";
      accuracyPercent?: number;
      diagnostics?: string;
    };
    feedbackMode?: QuestionFeedbackMode;
  };
}

export interface TutorResponse {
  reply: string;
  suggestions: string[];
  sessionId: string | null;
}

export async function callTutor(req: TutorRequest): Promise<TutorResponse> {
  if (!req.contentId) throw new AiUnavailableError();
  try {
    const response = await api.post<Partial<TutorResponse>>(
      "/chat/tutor",
      req,
    );
    const reply = response.data?.reply?.trim();
    if (!reply) throw new AiUnavailableError();
    return {
      reply,
      suggestions: Array.isArray(response.data?.suggestions)
        ? response.data.suggestions.filter(
            (s): s is string => typeof s === "string" && s.trim().length > 0,
          )
        : [],
      sessionId:
        typeof response.data?.sessionId === "string"
          ? response.data.sessionId
          : null,
    };
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    throw new AiUnavailableError();
  }
}

/**
 * Map a feedback-card thread (stored as role "student" | "ai") to the tutor
 * contract, prepending the original answer + first AI feedback so anonymous
 * follow-ups keep full context (logged-in users get server history instead).
 */
export function feedbackThreadToClientThread(opts: {
  originalAnswer?: string;
  initialFeedback?: string;
  thread: { role: "student" | "ai"; text: string; createdAt?: string }[];
}): TutorThreadEntry[] {
  const entries: TutorThreadEntry[] = [];
  if (opts.originalAnswer?.trim()) {
    entries.push({ role: "student", text: opts.originalAnswer });
  }
  if (opts.initialFeedback?.trim()) {
    entries.push({ role: "tutor", text: opts.initialFeedback });
  }
  for (const message of opts.thread) {
    if (!message.text?.trim()) continue;
    entries.push({
      role: message.role === "ai" ? "tutor" : "student",
      text: message.text,
      createdAt: message.createdAt,
    });
  }
  return entries;
}

/**
 * Flatten a {question, answer} Q&A history (Ask-AI modal, QuestionAgent block)
 * into alternating student/tutor entries.
 */
export function qaHistoryToClientThread(
  history: { question: string; answer: string; createdAt?: string }[],
): TutorThreadEntry[] {
  const entries: TutorThreadEntry[] = [];
  for (const item of history) {
    if (item.question?.trim()) {
      entries.push({
        role: "student",
        text: item.question,
        createdAt: item.createdAt,
      });
    }
    if (item.answer?.trim()) {
      entries.push({
        role: "tutor",
        text: item.answer,
        createdAt: item.createdAt,
      });
    }
  }
  return entries;
}
