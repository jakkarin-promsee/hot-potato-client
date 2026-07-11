import { useEffect } from "react";
import { create } from "zustand";

const SCROLL_THRESHOLD = 8;
const TOP_EPSILON = 12;

export function isGuideShowcasePath(pathname: string) {
  return pathname === "/guide/learning" || pathname === "/guide/creating";
}

interface RevealOnScrollUpStore {
  active: boolean;
  revealed: boolean;
  setActive: (active: boolean) => void;
  setRevealed: (revealed: boolean) => void;
}

const useRevealOnScrollUpStore = create<RevealOnScrollUpStore>((set) => ({
  active: false,
  revealed: true,
  setActive: (active) => set({ active, revealed: true }),
  setRevealed: (revealed) => set({ revealed }),
}));

/** One window scroll listener — mount from TopNav when guide showcase routes are active. */
export function useRevealOnScrollUpListener(enabled: boolean) {
  const setActive = useRevealOnScrollUpStore((s) => s.setActive);
  const setRevealed = useRevealOnScrollUpStore((s) => s.setRevealed);

  useEffect(() => {
    setActive(enabled);
    if (!enabled) return;

    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      if (y <= TOP_EPSILON) {
        setRevealed(true);
      } else {
        const delta = y - lastY;
        if (delta > SCROLL_THRESHOLD) setRevealed(false);
        else if (delta < -SCROLL_THRESHOLD) setRevealed(true);
      }
      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      setActive(false);
      setRevealed(true);
    };
  }, [enabled, setActive, setRevealed]);
}

/** True while headers should be visible; always true when reveal mode is off. */
export function useRevealOnScrollUp(enabled: boolean) {
  const active = useRevealOnScrollUpStore((s) => s.active);
  const revealed = useRevealOnScrollUpStore((s) => s.revealed);
  return !enabled || !active || revealed;
}
