import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/auth.store";

export interface TutorPersonalityOption {
  id: string;
  labelTh: string;
  labelEn: string;
  emoji: string;
}

/** Client copy of the server catalog (no prompt blocks). */
export const TUTOR_PERSONALITY_CATALOG: readonly TutorPersonalityOption[] = [
  { id: "default", labelTh: "น้องมันฝรั่งคลาสสิก", labelEn: "Classic", emoji: "🥔" },
  { id: "gentle", labelTh: "สุภาพ อ่อนโยน", labelEn: "Gentle", emoji: "🌷" },
  { id: "sassy", labelTh: "แสบๆ ขี้แซว", labelEn: "Sassy", emoji: "😏" },
  { id: "detailed", labelTh: "อธิบายละเอียด", labelEn: "Detailed", emoji: "🔍" },
  { id: "concise", labelTh: "สั้น กระชับ", labelEn: "Concise", emoji: "⚡" },
  { id: "serious", labelTh: "จริงจัง โฟกัส", labelEn: "Serious", emoji: "🎯" },
] as const;

interface TutorPersonalityState {
  personality: string;
  setPersonality: (id: string) => void;
  hydrateFromServer: () => Promise<void>;
}

export const useTutorPersonalityStore = create<TutorPersonalityState>()(
  persist(
    (set, get) => ({
      personality: "default",
      setPersonality: (id) => set({ personality: id }),
      hydrateFromServer: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;
        if (get().personality !== "default") return;
        try {
          const res = await api.get<{ tutor_personality?: string }>(
            "/chat/memory",
            { skipAuthRedirect: true },
          );
          const raw = res.data?.tutor_personality;
          const fromServer = typeof raw === "string" ? raw.trim() : "";
          if (fromServer) set({ personality: fromServer });
        } catch {
          // anonymous-style degrade — keep local choice
        }
      },
    }),
    { name: "tutor-personality-storage" },
  ),
);
