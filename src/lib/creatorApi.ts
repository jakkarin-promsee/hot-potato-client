/**
 * The single client bridge to the teacher AI copilot endpoint
 * `POST /api/creator/assist` (Tier 3.5) — the creator-side sibling of
 * `editor/extensions/tutorApi.ts`. JSON-only (no SSE): plain axios.
 *
 * Every AI result is preview → accept in the UI; nothing here touches the
 * editor document.
 */
import api from "@/lib/axios";
import axios from "axios";

export type CreatorErrorCode =
  | "AI_UNAVAILABLE"
  | "BAD_REQUEST"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "UNAUTHORIZED";

/**
 * Machine-code-only error (components render the bilingual copy themselves —
 * t() is a hook and can't be used in a lib file).
 */
export class CreatorAiError extends Error {
  code: CreatorErrorCode;

  constructor(code: CreatorErrorCode) {
    super(`Creator AI error: ${code}`);
    this.name = "CreatorAiError";
    this.code = code;
  }
}

// ─── Shared result shapes (mirror server/src/services/creator/validate.ts) ───

export type GeneratedQuestion =
  | {
      type: "choice";
      question: string;
      choices: { text: string; correct: boolean }[];
    }
  | { type: "write"; question: string; guideAnswer: string }
  | {
      type: "blank_choice";
      template: string;
      choices: string[];
      correctByBlank: number[];
    }
  | { type: "blank_write"; template: string; blankAnswers: string[] };

export type GeneratedQuestionType = GeneratedQuestion["type"];

export type ProofreadPreset =
  | "proofread"
  | "format"
  | "simplify"
  | "shorten"
  | "expand"
  | "reading_level";

export interface CriticIssue {
  area: "accuracy" | "completeness" | "readability" | "age_fit" | "questions";
  severity: "info" | "warn";
  where: string;
  note: string;
  suggestion?: string;
}

export interface CriticReport {
  summary: string;
  issues: CriticIssue[];
  checklist: { item: string; pass: boolean }[];
}

export interface AgentSettingsSuggestion {
  persona_note: string;
  custom_guidelines: string;
  scope: "lesson_only" | "lesson_plus_general";
  allow_direct_answers: boolean;
  reason: string;
}

// ─── Action contract: payload + result per action ────────────────────────────

export interface CreatorActionMap {
  formula_latex: {
    payload: { formulaText: string; description?: string; usage?: string };
    result: { latex: string; note?: string };
  };
  proofread: {
    payload: { markdown: string; preset: ProofreadPreset; gradeLevel?: string };
    result: { markdown: string };
  };
  generate_questions: {
    payload: {
      scope: "lesson" | "selection";
      selectionMarkdown?: string;
      types: GeneratedQuestionType[];
      count: number;
      difficulty?: "easy" | "medium" | "hard" | "mixed";
    };
    result: { questions: GeneratedQuestion[] };
  };
  guide_answer: {
    payload: { question: string };
    result: { guideAnswer: string };
  };
  distractors: {
    payload: { question: string; correctText: string; existing?: string[] };
    result: { distractors: string[] };
  };
  outline: {
    payload: { topic: string; gradeLevel?: string; objectives?: string };
    result: { outlineMarkdown: string };
  };
  draft_section: {
    payload: { heading: string; outlineMarkdown?: string; styleHint?: string };
    result: { markdown: string };
  };
  import_structure: {
    payload: { rawText: string };
    result: { markdown: string; suggestedQuestions: GeneratedQuestion[] };
  };
  critic: { payload: Record<string, never>; result: CriticReport };
  lesson_meta: {
    payload: Record<string, never>;
    result: { title: string; description: string; topics: string[] };
  };
  agent_settings_suggest: {
    payload: Record<string, never>;
    result: AgentSettingsSuggestion;
  };
}

export type CreatorAction = keyof CreatorActionMap;

function toCreatorError(error: unknown): CreatorAiError {
  if (axios.isAxiosError(error) && error.response) {
    const { status, data } = error.response;
    const serverCode = (data as { code?: unknown })?.code;
    if (serverCode === "AI_UNAVAILABLE") {
      return new CreatorAiError("AI_UNAVAILABLE");
    }
    if (status === 400) return new CreatorAiError("BAD_REQUEST");
    if (status === 401) return new CreatorAiError("UNAUTHORIZED");
    if (status === 403) return new CreatorAiError("FORBIDDEN");
    if (status === 404) return new CreatorAiError("NOT_FOUND");
  }
  return new CreatorAiError("AI_UNAVAILABLE");
}

export async function callCreator<A extends CreatorAction>(
  contentId: string,
  action: A,
  payload: CreatorActionMap[A]["payload"],
): Promise<CreatorActionMap[A]["result"]> {
  if (!contentId) throw new CreatorAiError("BAD_REQUEST");
  try {
    const response = await api.post<{ result: CreatorActionMap[A]["result"] }>(
      "/creator/assist",
      { contentId, action, payload },
    );
    const result = response.data?.result;
    if (!result) throw new CreatorAiError("AI_UNAVAILABLE");
    return result;
  } catch (error) {
    if (error instanceof CreatorAiError) throw error;
    throw toCreatorError(error);
  }
}
