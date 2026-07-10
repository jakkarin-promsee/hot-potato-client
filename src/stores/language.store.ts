import { create } from "zustand";

export type AppLanguage = "en" | "th";

interface LanguageState {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
}

const LANGUAGE_STORAGE_KEY = "app-language";

const applyDocumentLanguage = (language: AppLanguage) => {
  if (typeof document === "undefined") return;

  document.documentElement.lang = language;
};

const detectInitialLanguage = (): AppLanguage => {
  if (typeof window === "undefined") return "th";

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === "en" || saved === "th") return saved;

  return "th";
};

export const useLanguageStore = create<LanguageState>((set, get) => {
  const initialLanguage = detectInitialLanguage();
  applyDocumentLanguage(initialLanguage);

  return {
    language: initialLanguage,
    setLanguage: (language) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      }
      applyDocumentLanguage(language);
      set({ language });
    },
    toggleLanguage: () => {
      const next = get().language === "en" ? "th" : "en";
      get().setLanguage(next);
    },
  };
});
