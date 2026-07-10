import { create } from "zustand";
import api from "@/lib/axios";

export interface RecentTopic {
  content_id: string;
  summary: string;
  updatedAt: string;
}

export interface TutorMemory {
  interests: string[];
  strengths: string[];
  growth_areas: string[];
  preferences: string[];
  recent_topics: RecentTopic[];
}

const EMPTY_MEMORY: TutorMemory = {
  interests: [],
  strengths: [],
  growth_areas: [],
  preferences: [],
  recent_topics: [],
};

export const isMemoryEmpty = (memory: TutorMemory): boolean =>
  memory.interests.length === 0 &&
  memory.strengths.length === 0 &&
  memory.growth_areas.length === 0 &&
  memory.preferences.length === 0 &&
  memory.recent_topics.length === 0;

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

// GET /chat/memory returns the raw StudentMemory doc (or {} when none exists).
// Normalize to the five public groups and DROP internal fields — _id, user_id,
// tutor_personality, timestamps must never reach the UI.
const normalizeMemory = (data: Record<string, unknown>): TutorMemory => ({
  interests: toStringArray(data.interests),
  strengths: toStringArray(data.strengths),
  growth_areas: toStringArray(data.growth_areas),
  preferences: toStringArray(data.preferences),
  recent_topics: Array.isArray(data.recent_topics)
    ? (data.recent_topics as RecentTopic[]).filter(
        (topic) =>
          typeof topic?.summary === "string" && topic.summary.trim() !== "",
      )
    : [],
});

interface TutorMemoryState {
  memory: TutorMemory | null; // null = not fetched yet
  isLoading: boolean;
  isClearing: boolean;
  error: "load_failed" | "clear_failed" | null;
  fetchMemory: () => Promise<void>;
  clearMemory: () => Promise<void>;
}

export const useTutorMemoryStore = create<TutorMemoryState>((set) => ({
  memory: null,
  isLoading: false,
  isClearing: false,
  error: null,

  fetchMemory: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<Record<string, unknown>>("/chat/memory");
      set({ memory: normalizeMemory(res.data ?? {}), isLoading: false });
    } catch {
      set({ error: "load_failed", isLoading: false });
    }
  },

  clearMemory: async () => {
    set({ isClearing: true, error: null });
    try {
      await api.delete("/chat/memory");
      set({ memory: { ...EMPTY_MEMORY }, isClearing: false });
    } catch {
      set({ error: "clear_failed", isClearing: false });
      throw new Error("clear_failed");
    }
  },
}));
