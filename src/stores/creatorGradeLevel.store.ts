import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GRADE_LEVELS } from "@/components/editor/ai/writingAssist";

interface CreatorGradeLevelState {
  /** Last grade the teacher picked in any creator-AI surface (outline, questions, writing). */
  gradeLevel: string;
  setGradeLevel: (grade: string) => void;
}

export const useCreatorGradeLevelStore = create<CreatorGradeLevelState>()(
  persist(
    (set) => ({
      gradeLevel: "",
      setGradeLevel: (grade) => {
        if (!grade || GRADE_LEVELS.includes(grade)) {
          set({ gradeLevel: grade });
        }
      },
    }),
    { name: "creator-grade-level" },
  ),
);
