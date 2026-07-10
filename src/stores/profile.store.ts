import { create } from "zustand";
import api from "../lib/axios";
import { useAuthStore } from "./auth.store";

export interface ProfileData {
  avatar: string;
  bio: string;
  nickname: string;
}

interface ProfileState {
  profile: ProfileData | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  saveProfile: (
    changes: Partial<{ name: string; avatar: string; bio: string; nickname: string }>,
  ) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  isSaving: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get("/users/me/profile");
      set({ profile: res.data.profile, isLoading: false });

      const authUser = useAuthStore.getState().user;
      const serverUser = res.data.user;
      if (
        authUser &&
        serverUser &&
        (authUser.name !== serverUser.name ||
          authUser.email !== serverUser.email ||
          authUser.role !== serverUser.role)
      ) {
        useAuthStore.setState({
          user: {
            id: serverUser.id,
            name: serverUser.name,
            email: serverUser.email,
            role: serverUser.role,
          },
        });
      }
    } catch {
      set({ error: "Failed to load profile.", isLoading: false });
    }
  },

  saveProfile: async (changes) => {
    set({ isSaving: true, error: null });
    try {
      const res = await api.put("/users/me/profile", changes);
      set({ profile: res.data.profile, isSaving: false });

      if (changes.name !== undefined) {
        const authUser = useAuthStore.getState().user;
        if (authUser) {
          useAuthStore.setState({
            user: { ...authUser, name: res.data.user.name },
          });
        }
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save profile.";
      set({ error: message, isSaving: false });
      throw err;
    }
  },
}));
