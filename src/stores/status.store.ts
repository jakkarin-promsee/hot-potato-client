import { create } from "zustand";
import api from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServerCheck {
  status: "ok" | "error";
  uptime: string;
  environment: string;
  node_version?: string;
  memory?: {
    rss_mb: string;
    heap_used_mb: string;
    heap_total_mb: string;
  };
  platform?: string;
  hostname?: string;
}

export interface DatabaseCheck {
  status: "ok" | "error";
  connection: string;
  ready_state?: number;
  host?: string;
  port?: number;
  db_name?: string;
}

export interface EnvVar {
  key: string;
  loaded: boolean;
}

export interface EnvCheck {
  status: "ok" | "error";
  variables: EnvVar[];
}

export interface AiCheck {
  status: "ok" | "degraded" | "unknown";
  last_success: string | null;
  last_failure: string | null;
}

export interface RecentError {
  time: string;
  method: string;
  route: string;
  status: number;
}

export interface ErrorsCheck {
  count_since_boot: number;
  last_error_at: string | null;
  since: string;
  recent: RecentError[];
}

export interface AllStatusResponse {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  checks: {
    server: ServerCheck;
    database: DatabaseCheck;
    env: EnvCheck;
    ai?: AiCheck;
    errors?: ErrorsCheck;
  };
}

interface StatusState {
  data: AllStatusResponse | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  fetch: () => Promise<void>;
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStatusStore = create<StatusState>((set) => ({
  data: null,
  loading: false,
  error: null,
  lastFetched: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get<AllStatusResponse>("/status/all", {
        validateStatus: (s) => s === 200 || s === 503,
      });

      // 1. Cast to unknown so we can safely check the type without TS interference
      const rawData = response.data as unknown;

      // 2. Check if it's actually a string (HTML)
      if (typeof rawData === "string") {
        // Now TS knows rawData is a string, so .includes() is allowed
        if (rawData.includes("<!doctype html>") || rawData.includes("<html")) {
          throw new Error("404: API route not found (Server returned HTML)");
        }
      }

      // 3. Check if it's the object we actually wanted
      if (!rawData || typeof rawData !== "object" || !("checks" in rawData)) {
        throw new Error("Invalid Response: Path is wrong or API is down.");
      }

      // 4. Success - cast it back to our interface
      set({
        data: rawData as AllStatusResponse,
        loading: false,
        error: null,
        lastFetched: new Date(),
      });
    } catch (err: any) {
      // This will now catch the HTML fallback error properly
      set({
        data: null,
        error: err.message || "Connection Error",
        loading: false,
      });
    }
  },

  reset: () => set({ data: null, error: null, lastFetched: null }),
}));
