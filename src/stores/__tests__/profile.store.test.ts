import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGet, mockPut, authSetState } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
  authSetState: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { get: mockGet, put: mockPut },
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: {
    getState: () => ({
      user: { id: "u1", name: "Old", email: "a@test.local", role: "learner" },
    }),
    setState: authSetState,
  },
}));

import { useProfileStore } from "../profile.store";

beforeEach(() => {
  mockGet.mockReset();
  mockPut.mockReset();
  authSetState.mockReset();
  useProfileStore.setState({
    profile: null,
    isLoading: false,
    isSaving: false,
    error: null,
  });
});

describe("profile.store", () => {
  it("fetchProfile populates state from GET shape", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        user: { id: "u1", name: "Alice", email: "a@test.local", role: "learner" },
        profile: { avatar: "", bio: "Hi", nickname: "Al" },
      },
    });

    await useProfileStore.getState().fetchProfile();

    expect(mockGet).toHaveBeenCalledWith("/users/me/profile");
    expect(useProfileStore.getState().profile).toEqual({
      avatar: "",
      bio: "Hi",
      nickname: "Al",
    });
    expect(useProfileStore.getState().isLoading).toBe(false);
  });

  it("saveProfile PUTs only changed fields", async () => {
    mockPut.mockResolvedValueOnce({
      data: {
        user: { id: "u1", name: "Alice", email: "a@test.local", role: "learner" },
        profile: { avatar: "", bio: "New bio", nickname: "" },
      },
    });

    await useProfileStore.getState().saveProfile({ bio: "New bio" });

    expect(mockPut).toHaveBeenCalledWith("/users/me/profile", { bio: "New bio" });
    expect(useProfileStore.getState().profile?.bio).toBe("New bio");
  });

  it("saveProfile syncs auth.store user.name on success", async () => {
    mockPut.mockResolvedValueOnce({
      data: {
        user: { id: "u1", name: "New Name", email: "a@test.local", role: "learner" },
        profile: { avatar: "", bio: "", nickname: "" },
      },
    });

    await useProfileStore.getState().saveProfile({ name: "New Name" });

    expect(authSetState).toHaveBeenCalledWith({
      user: {
        id: "u1",
        name: "New Name",
        email: "a@test.local",
        role: "learner",
      },
    });
  });

  it("API failure sets error and clears busy flag", async () => {
    mockGet.mockRejectedValueOnce(new Error("network"));

    await useProfileStore.getState().fetchProfile();

    expect(useProfileStore.getState().error).toBe("Failed to load profile.");
    expect(useProfileStore.getState().isLoading).toBe(false);
  });
});
