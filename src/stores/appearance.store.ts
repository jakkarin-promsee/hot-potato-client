import { create } from "zustand";

export type FontSize = "small" | "normal" | "large" | "xlarge";

export const FONT_SIZE_OPTIONS: readonly {
  id: FontSize;
  css: string;
  labelTh: string;
  labelEn: string;
}[] = [
  { id: "small", css: "87.5%", labelTh: "เล็ก", labelEn: "Small" },
  { id: "normal", css: "100%", labelTh: "ปกติ", labelEn: "Normal" },
  { id: "large", css: "112.5%", labelTh: "ใหญ่", labelEn: "Large" },
  { id: "xlarge", css: "125%", labelTh: "ใหญ่มาก", labelEn: "Extra large" },
] as const;

interface AppearanceState {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FONT_SIZE_STORAGE_KEY = "app-font-size";

const isFontSize = (value: unknown): value is FontSize =>
  FONT_SIZE_OPTIONS.some((option) => option.id === value);

const detectInitialFontSize = (): FontSize => {
  if (typeof window === "undefined") return "normal";
  const saved = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
  return isFontSize(saved) ? saved : "normal";
};

const applyFontSize = (size: FontSize) => {
  if (typeof document === "undefined") return;
  const option = FONT_SIZE_OPTIONS.find((o) => o.id === size);
  // "normal" clears the inline style so the browser default stays in charge
  // (rem-based Tailwind sizes then follow the user's own browser setting).
  document.documentElement.style.fontSize =
    !option || option.id === "normal" ? "" : option.css;
};

const initialFontSize = detectInitialFontSize();
applyFontSize(initialFontSize);

export const useAppearanceStore = create<AppearanceState>((set) => ({
  fontSize: initialFontSize,
  setFontSize: (size) => {
    applyFontSize(size);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
    }
    set({ fontSize: size });
  },
}));
