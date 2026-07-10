import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BookmarkState {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      ids: [],

      toggle: (id: string) => {
        const current = get().ids;
        if (current.includes(id)) {
          set({ ids: current.filter((x) => x !== id) });
        } else {
          set({ ids: [...current, id] });
        }
      },

      has: (id: string) => get().ids.includes(id),
    }),
    { name: "bookmark-storage" },
  ),
);
