import TiptapViewer from "@/components/editor/TiptapViewer";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { useCanvasStore } from "@/stores/canvas.store";
import { useAnswerStore } from "@/stores/content-answer.store";
import { useLearningHistoryStore } from "@/stores/learningHistory.store";
import { useTutorPersonalityStore } from "@/stores/tutorPersonality.store";
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

function TiptapView() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const { loadContent, isLoading, contentLoadError } = useCanvasStore();
  const { loadAnswers, syncAnswers, isDirty } = useAnswerStore();
  const recordVisit = useLearningHistoryStore((s) => s.recordVisit);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastWindowScrollYRef = useRef(0);

  const hydratePersonality = useTutorPersonalityStore((s) => s.hydrateFromServer);

  useEffect(() => {
    if (!id) return;
    void loadContent(id);
    void hydratePersonality();
    if (!token) return;
    loadAnswers(id);
    void recordVisit(id);
  }, [id, token, loadContent, loadAnswers, recordVisit, hydratePersonality]);

  // 30s auto sync (signed-in only)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (isDirty) syncAnswers();
    }, 30000);
    return () => clearInterval(interval);
  }, [token, isDirty, syncAnswers]);

  // Save on page leave (signed-in only)
  useEffect(() => {
    if (!token) return;
    const handleLeave = () => syncAnswers();
    window.addEventListener("beforeunload", handleLeave);
    return () => window.removeEventListener("beforeunload", handleLeave);
  }, [token, syncAnswers]);

  const STALE_THRESHOLD = 60 * 1000;
  useEffect(() => {
    if (!token || !id) return;

    let hiddenAt: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      if (!hiddenAt) return;
      const awayMs = Date.now() - hiddenAt;
      hiddenAt = null;
      if (awayMs > STALE_THRESHOLD) {
        loadAnswers(id);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [id, token, loadAnswers]);

  useEffect(() => {
    const MIN_DELTA = 8;

    const handleWindowScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastWindowScrollYRef.current;
      if (Math.abs(delta) < MIN_DELTA) return;

      if (currentY <= 12) {
        setIsNavVisible(true);
      } else {
        setIsNavVisible(delta < 0);
      }

      lastWindowScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);

  if (isLoading)
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <TopNav />
        <div className="flex flex-1 items-center justify-center">
          <span className="animate-pulse text-sm text-muted-foreground">
            Loading content...
          </span>
        </div>
      </div>
    );

  if (contentLoadError) {
    const needsLogin =
      !token &&
      typeof contentLoadError === "string" &&
      /login required/i.test(contentLoadError);

    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <TopNav />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-md text-sm text-muted-foreground">
            {contentLoadError}
          </p>
          {needsLogin && (
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Log in</Link>
            </Button>
          )}
          <Link
            to="/explore"
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div
        className={`fixed inset-x-0 top-0 z-50 transition-transform duration-200 ${
          isNavVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <TopNav />
      </div>
      <div
        className={`flex-1 min-h-0 transition-[padding-top] duration-200 ${
          isNavVisible ? "pt-(--app-nav-height)" : "pt-0"
        }`}
      >
        <TiptapViewer
          onScrollDirectionChange={(direction) =>
            setIsNavVisible(direction !== "down")
          }
        />
      </div>
    </div>
  );
}

export default TiptapView;
