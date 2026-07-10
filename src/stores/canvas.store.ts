import { create } from "zustand";
import api from "../lib/axios";

function normalizeMongoId(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && "_id" in raw) {
    const inner = (raw as { _id?: unknown })._id;
    return typeof inner === "string" ? inner : String(inner ?? "");
  }
  return String(raw);
}

export type AgentSettings = {
  persona_note: string;
  allow_direct_answers: boolean;
  scope: "lesson_only" | "lesson_plus_general";
  custom_guidelines: string;
};

const defaultAgentSettings: AgentSettings = {
  persona_note: "",
  allow_direct_answers: false,
  scope: "lesson_plus_general",
  custom_guidelines: "",
};

interface CanvasState {
  contentId: string | null;
  /** Content owner user id (from load); used on view page for edit affordance. */
  ownerId: string | null;
  title: string;
  titleImage: string;
  tiptapJson: string;
  collaborators: string[];
  accessType: "public" | "link-only" | "private";
  topics: string[];
  description: string;
  agentSettings: AgentSettings;
  isSaving: boolean;
  isLoading: boolean;
  isDirty: boolean; // unsaved changes?
  updatedAt: string | null; // 👈 track version
  conflict: boolean; // 👈 conflict flag
  /** Set when /content/load fails (e.g. 401 private link while logged out). */
  contentLoadError: string | null;

  loadContent: (id: string) => Promise<void>;
  saveContent: () => Promise<void>;
  forceSave: () => Promise<void>;
  setTitle: (title: string) => void;
  setTitleImage: (url: string) => void;
  setTiptapJson: (json: string) => void;
  setCollaborators: (collaborators: string[]) => void;
  setAccessType: (accessType: "public" | "link-only" | "private") => void;
  setTopics: (topics: string[]) => void;
  setDescription: (description: string) => void;
  setAgentSettings: (settings: AgentSettings) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  contentId: null,
  ownerId: null,
  title: "Untitled",
  titleImage: "",
  tiptapJson: "{}",
  collaborators: [],
  accessType: "private",
  topics: [],
  description: "",
  agentSettings: { ...defaultAgentSettings },
  isSaving: false,
  isLoading: false,
  isDirty: false,
  updatedAt: null,
  conflict: false,
  contentLoadError: null,

  loadContent: async (id: string) => {
    set({ isLoading: true, conflict: false, contentLoadError: null });
    try {
      const res = await api.get(`/content/load?id=${id}`);
      const collaborators = Array.isArray(res.data.collaborators)
        ? res.data.collaborators.map((c: unknown) => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object" && "_id" in c) {
              const raw = (c as { _id?: unknown })._id;
              return typeof raw === "string" ? raw : String(raw ?? "");
            }
            return String(c ?? "");
          })
        : [];

      set({
        contentId: id,
        ownerId: normalizeMongoId(res.data.owner_id),
        title: res.data.title,
        titleImage: res.data.title_image ?? "",
        tiptapJson: res.data.tiptap_json,
        collaborators: collaborators.filter(Boolean),
        accessType: res.data.access_type ?? "private",
        topics: Array.isArray(res.data.topics) ? res.data.topics : [],
        description: res.data.description ?? "",
        agentSettings: res.data.agent_settings
          ? {
              persona_note:
                typeof res.data.agent_settings.persona_note === "string"
                  ? res.data.agent_settings.persona_note
                  : "",
              allow_direct_answers:
                res.data.agent_settings.allow_direct_answers === true,
              scope:
                res.data.agent_settings.scope === "lesson_only"
                  ? "lesson_only"
                  : "lesson_plus_general",
              custom_guidelines:
                typeof res.data.agent_settings.custom_guidelines === "string"
                  ? res.data.agent_settings.custom_guidelines
                  : "",
            }
          : { ...defaultAgentSettings },
        updatedAt: res.data.updatedAt, // 👈 store server time
        isLoading: false,
        isDirty: false,
        contentLoadError: null,
      });
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message;
      set({
        isLoading: false,
        contentId: id,
        ownerId: null,
        tiptapJson: "{}",
        contentLoadError:
          typeof message === "string" && message.length > 0
            ? message
            : "Could not load this content.",
      });
    }
  },

  saveContent: async () => {
    const {
      contentId,
      title,
      titleImage,
      tiptapJson,
      collaborators,
      accessType,
      topics,
      description,
      agentSettings,
      updatedAt,
      isDirty,
    } = get();
    if (!contentId || !isDirty) return;

    set({ isSaving: true });

    try {
      const res = await api.put(`/content/${contentId}`, {
        title,
        title_image: titleImage,
        tiptap_json: tiptapJson,
        collaborators,
        access_type: accessType,
        topics,
        description,
        agent_settings: agentSettings,
        clientUpdatedAt: updatedAt, // 👈 send our version timestamp
      });

      // Update our local timestamp to the new server time
      set({ isSaving: false, isDirty: false, updatedAt: res.data.updatedAt });
    } catch (err: any) {
      set({ isSaving: false });

      if (err.response?.status === 409) {
        // Conflict — stop isDirty so beforeunload won't retry
        set({ conflict: true, isDirty: false });
      }
    }
  },

  forceSave: async () => {
    const {
      contentId,
      title,
      titleImage,
      tiptapJson,
      collaborators,
      accessType,
      topics,
      description,
      agentSettings,
    } = get();
    if (!contentId) return;

    set({ isSaving: true });
    const res = await api.put(`/content/${contentId}`, {
      title,
      title_image: titleImage,
      tiptap_json: tiptapJson,
      collaborators,
      access_type: accessType,
      topics,
      description,
      agent_settings: agentSettings,
      // 👆 no clientUpdatedAt — skips version check
    });
    set({
      isSaving: false,
      isDirty: false,
      conflict: false,
      updatedAt: res.data.updatedAt,
    });
  },

  setTitle: (title) => set({ title, isDirty: true }),
  setTitleImage: (titleImage) => set({ titleImage, isDirty: true }),
  setTiptapJson: (json) => set({ tiptapJson: json, isDirty: true }),
  setCollaborators: (collaborators) => set({ collaborators, isDirty: true }),
  setAccessType: (accessType) => set({ accessType, isDirty: true }),
  setTopics: (topics) => set({ topics, isDirty: true }),
  setDescription: (description) => set({ description, isDirty: true }),
  setAgentSettings: (agentSettings) => set({ agentSettings, isDirty: true }),
}));
