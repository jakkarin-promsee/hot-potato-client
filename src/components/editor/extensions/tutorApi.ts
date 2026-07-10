import api from "@/lib/axios";
import { useAuthStore } from "@/stores/auth.store";
import { useTutorPersonalityStore } from "@/stores/tutorPersonality.store";
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
  personality?: string;
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

export interface TutorStreamCallbacks {
  onToken: (text: string) => void;
}

function tutorHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = useAuthStore.getState().token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function attachPersonality<T extends TutorRequest>(req: T): T & { personality: string } {
  return {
    ...req,
    personality: useTutorPersonalityStore.getState().personality,
  };
}

function parseSseBuffer(buffer: string): {
  events: { event: string; data: unknown }[];
  rest: string;
} {
  const events: { event: string; data: unknown }[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const block of parts) {
    if (!block.trim()) continue;
    let event = "";
    let dataLine = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7);
      if (line.startsWith("data: ")) dataLine = line.slice(6);
    }
    if (event && dataLine) {
      try {
        events.push({ event, data: JSON.parse(dataLine) });
      } catch {
        // ignore malformed chunk
      }
    }
  }
  return { events, rest };
}

export async function callTutorStream(
  req: TutorRequest,
  cb: TutorStreamCallbacks,
): Promise<TutorResponse> {
  if (!req.contentId) throw new AiUnavailableError();

  let tokensDelivered = false;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/chat/tutor`,
      {
        method: "POST",
        headers: tutorHeaders(),
        body: JSON.stringify({ ...attachPersonality(req), stream: true }),
      },
    );

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/event-stream")) {
      return callTutor(req);
    }

    const body = response.body;
    if (!body) return callTutor(req);

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let reply = "";
    let suggestions: string[] = [];
    let sessionId: string | null = null;
    let gotDone = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseBuffer(buffer);
      buffer = parsed.rest;

      for (const { event, data } of parsed.events) {
        if (event === "token") {
          const text =
            typeof data === "object" &&
            data !== null &&
            typeof (data as { text?: unknown }).text === "string"
              ? (data as { text: string }).text
              : "";
          if (text) {
            tokensDelivered = true;
            cb.onToken(text);
          }
        } else if (event === "suggestions") {
          const raw =
            typeof data === "object" &&
            data !== null &&
            (data as { suggestions?: unknown }).suggestions;
          suggestions = Array.isArray(raw)
            ? raw.filter(
                (s): s is string => typeof s === "string" && s.trim().length > 0,
              )
            : [];
        } else if (event === "done") {
          gotDone = true;
          if (
            typeof data === "object" &&
            data !== null &&
            typeof (data as { reply?: unknown }).reply === "string"
          ) {
            reply = (data as { reply: string }).reply.trim();
          }
          sessionId =
            typeof data === "object" &&
            data !== null &&
            typeof (data as { sessionId?: unknown }).sessionId === "string"
              ? (data as { sessionId: string }).sessionId
              : null;
        } else if (event === "error") {
          throw new AiUnavailableError();
        }
      }
    }

    if (!gotDone || !reply) throw new AiUnavailableError();
    return { reply, suggestions, sessionId };
  } catch (error) {
    if (tokensDelivered) throw new AiUnavailableError();
    if (error instanceof AiUnavailableError) throw error;
    return callTutor(req);
  }
}

export async function callTutor(req: TutorRequest): Promise<TutorResponse> {
  if (!req.contentId) throw new AiUnavailableError();
  try {
    const response = await api.post<Partial<TutorResponse>>(
      "/chat/tutor",
      attachPersonality(req),
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
