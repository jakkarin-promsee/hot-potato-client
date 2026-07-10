import { useEffect, useState } from "react";
import { Brain, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTutorMemoryStore, isMemoryEmpty } from "@/stores/tutorMemory.store";
import { useAppI18n } from "@/lib/i18n";

function ChipGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TutorMemoryCard() {
  const { t } = useAppI18n();
  const { memory, isLoading, isClearing, error, fetchMemory, clearMemory } =
    useTutorMemoryStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearedFlash, setClearedFlash] = useState(false);

  useEffect(() => {
    void fetchMemory();
  }, [fetchMemory]);

  const handleClear = async () => {
    try {
      await clearMemory();
      setClearedFlash(true);
      setTimeout(() => setClearedFlash(false), 2500);
    } catch {
      // clear_failed rendered from the store state below
    }
  };

  const empty = memory !== null && isMemoryEmpty(memory);

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {t("What your tutor remembers", "ความจำของติวเตอร์")}
          </p>
        </div>
        {memory !== null && !empty && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            disabled={isClearing}
            onClick={() => setConfirmOpen(true)}
          >
            {isClearing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {t("Forget", "ลบความจำ")}
          </Button>
        )}
      </div>

      <div className="mt-3">
        {isLoading && memory === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error === "load_failed" ? (
          <div className="py-2 text-center">
            <p className="text-sm text-destructive" role="alert">
              {t("Couldn't load tutor memory.", "โหลดความจำของติวเตอร์ไม่สำเร็จ")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void fetchMemory()}
            >
              {t("Retry", "ลองอีกครั้ง")}
            </Button>
          </div>
        ) : empty ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {clearedFlash
              ? t("All forgotten 🥔", "ลบความจำแล้ว 🥔")
              : t(
                  "Chat with your tutor first — they'll start remembering you. 🥔",
                  "คุยกับติวเตอร์ไปก่อน เดี๋ยวเขาจะจำเธอได้เอง 🥔",
                )}
          </p>
        ) : memory ? (
          <div className="space-y-3">
            <ChipGroup
              label={t("Interests", "สิ่งที่สนใจ")}
              items={memory.interests}
            />
            <ChipGroup
              label={t("Strengths", "จุดแข็ง")}
              items={memory.strengths}
            />
            <ChipGroup
              label={t("Growing in", "กำลังพัฒนา")}
              items={memory.growth_areas}
            />
            <ChipGroup
              label={t("Preferences", "สไตล์ที่ชอบ")}
              items={memory.preferences}
            />
            <ChipGroup
              label={t("Recent topics", "เรื่องที่คุยกันล่าสุด")}
              items={memory.recent_topics.map((topic) => topic.summary)}
            />
            {error === "clear_failed" && (
              <p className="text-xs text-destructive" role="alert">
                {t("Couldn't clear memory. Try again.", "ลบความจำไม่สำเร็จ ลองอีกครั้งนะ")}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Clear tutor memory?", "ลบความจำของติวเตอร์?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "น้องมันฝรั่ง will forget everything it remembers about you — interests, strengths, recent topics. This can't be undone.",
                "น้องมันฝรั่งจะลืมทุกอย่างที่จำเกี่ยวกับเธอไว้ ทั้งสิ่งที่สนใจ จุดแข็ง และเรื่องที่เคยคุยกัน ลบแล้วกู้คืนไม่ได้นะ",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Keep it", "เก็บไว้ก่อน")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => void handleClear()}
            >
              {t("Clear memory", "ลบเลย")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
