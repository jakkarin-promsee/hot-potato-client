import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import TipTapEditor from "@/components/editor/TipTapEditor";
import { CanvasProvider } from "@/contexts/CanvasContext";
import { useCanvasStore } from "@/stores/canvas.store";
import { useLearningHistoryStore } from "@/stores/learningHistory.store";
import { MonitorSmartphone } from "lucide-react";

const TipTapCanvas = () => {
  const { id } = useParams<{ id: string }>();
  const { loadContent, isLoading } = useCanvasStore();
  const recordVisit = useLearningHistoryStore((s) => s.recordVisit);

  useEffect(() => {
    if (id) {
      loadContent(id);
      void recordVisit(id);
    }
  }, [id, loadContent, recordVisit]);

  // Auto save — read fresh store state each tick to avoid stale isDirty
  useEffect(() => {
    const interval = setInterval(() => {
      const { isDirty, saveContent: save } = useCanvasStore.getState();
      if (isDirty) void save();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Save on page leave
  useEffect(() => {
    const handleLeave = () => {
      void useCanvasStore.getState().saveContent();
    };
    window.addEventListener("beforeunload", handleLeave);
    return () => window.removeEventListener("beforeunload", handleLeave);
  }, []);

  // On canvas load, check if another tab has this content open
  const STALE_THRESHOLD = 60 * 1000; // 1 minute
  useEffect(() => {
    let hiddenAt: number | null = null;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        hiddenAt = Date.now(); // record when tab was hidden
        return;
      }

      // Tab became visible
      if (!hiddenAt) return;

      const awayMs = Date.now() - hiddenAt;
      hiddenAt = null;

      // Only re-sync if away for more than 1 minute
      if (awayMs > STALE_THRESHOLD && id) {
        await useCanvasStore.getState().saveContent();
        const { conflict: hasConflict } = useCanvasStore.getState();
        if (!hasConflict) loadContent(id);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [id, loadContent]);

  const desktopShell = (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <span className="animate-pulse text-sm text-muted-foreground">
              Loading content...
            </span>
          </div>
        ) : (
          <CanvasProvider>
            <TipTapEditor />
          </CanvasProvider>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-5 bg-background px-6 text-center md:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="canvas-mobile-gate-title"
      >
        <MonitorSmartphone className="h-14 w-14 text-violet-600" aria-hidden />
        <div className="max-w-sm space-y-3">
          <h1
            id="canvas-mobile-gate-title"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Editing needs a larger screen
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This editor is not available on phones. Please open this page on a
            computer to create and edit content.
          </p>
        </div>
        <Link
          to="/explore"
          className="text-sm font-medium text-violet-700 underline-offset-4 hover:underline"
        >
          Back to Explore
        </Link>
      </div>

      <div className="hidden md:block">{desktopShell}</div>
    </>
  );
};

export default TipTapCanvas;
