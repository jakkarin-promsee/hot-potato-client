import { create } from "zustand";
import api from "../lib/axios";

interface AnswerState {
  contentId: string | null;
  answers: Record<string, any>;
  isDirty: boolean;
  isLoading: boolean;

  loadAnswers: (contentId: string) => Promise<void>;
  setAnswer: (blockId: string, answer: any) => void;
  syncAnswers: () => Promise<void>;
}

export const useAnswerStore = create<AnswerState>((set, get) => ({
  contentId: null,
  answers: {},
  isDirty: false,
  isLoading: false,

  loadAnswers: async (contentId: string) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/content-answer/${contentId}`);
      set({ contentId, answers: res.data, isDirty: false, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  // Instant local update only — no API call
  setAnswer: (blockId, answer) => {
    set((state) => ({
      answers: { ...state.answers, [blockId]: answer },
      isDirty: true,
    }));
  },

  // Actual sync to DB
  syncAnswers: async () => {
    const { contentId, answers, isDirty } = get();

    if (!contentId || !isDirty) return;

    await api.put(`/content-answer/${contentId}/bulk`, { answers });
    set({ isDirty: false });
  },
}));
