import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  recheckToken: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ── Persisted data ──────────────────────
      user: null,
      token: null,

      // ── NOT persisted (but inside persist is fine) ──
      isLoading: false,
      error: null,

      // ── Functions ───────────────────────────
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post("/auth/login", { email, password });
          set({ user: res.data.user, token: res.data.token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post("/auth/register", { name, email, password });
          set({ user: res.data.user, token: res.data.token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      recheckToken: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        try {
          const res = await api.get("/auth/recheck", {
            // Let store decide redirect behavior after token clear.
            skipAuthRedirect: true,
          });
          set({ user: res.data.user, token: res.data.token ?? token, error: null });
        } catch {
          set({ user: null, token: null });
        }
      },

      logout: () => {
        set({ user: null, token: null });
      },
    }),
    {
      name: "auth-storage",
      // ✅ Only persist what matters
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
);
