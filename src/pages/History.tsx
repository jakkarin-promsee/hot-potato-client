import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { ContentCard } from "@/components/ContentCard";
import { useNavigate } from "react-router-dom";
import {
  useLearningHistoryStore,
  type LearningHistoryEntry,
} from "@/stores/learningHistory.store";
import { formatAuthorLine } from "@/lib/formatAuthors";
import { useAppI18n } from "@/lib/i18n";

type Translate = (english: string, thai: string) => string;

function authorWithRelativeTime(
  row: LearningHistoryEntry,
  t: Translate,
  isThai: boolean,
): string {
  const names = formatAuthorLine(
    row.content.author_name,
    row.content.collaborator_names,
  );
  const rel = formatRelative(row.last_accessed, t, isThai);
  return names ? `${names} · ${rel}` : rel;
}

function formatRelative(iso: string, t: Translate, isThai: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) {
    return t(`${mins}m ago`, `${mins} นาทีที่แล้ว`);
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return t(`${hrs}h ago`, `${hrs} ชม. ที่แล้ว`);
  }
  const days = Math.floor(hrs / 24);
  if (days < 7) {
    return t(`${days}d ago`, `${days} วันที่แล้ว`);
  }
  return new Date(iso).toLocaleDateString(isThai ? "th-TH" : "en-US");
}

function groupByDate(
  entries: LearningHistoryEntry[],
  t: Translate,
  isThai: boolean,
): Record<string, LearningHistoryEntry[]> {
  const groups: Record<string, LearningHistoryEntry[]> = {};
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  for (const entry of entries) {
    const d = new Date(entry.last_accessed);
    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = t("Today", "วันนี้");
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = t("Yesterday", "เมื่อวาน");
    } else {
      label = d.toLocaleDateString(isThai ? "th-TH" : "en-US", {
        month: "short",
        day: "numeric",
      });
    }

    if (!groups[label]) groups[label] = [];
    groups[label]!.push(entry);
  }
  return groups;
}

export default function History() {
  const navigate = useNavigate();
  const { entries, isLoading, error, fetchHistory } = useLearningHistoryStore();
  const { t, isThai } = useAppI18n();

  useEffect(() => {
    fetchHistory(100);
  }, [fetchHistory]);

  const grouped = useMemo(
    () => groupByDate(entries, t, isThai),
    [entries, t, isThai],
  );

  return (
    <div className="container px-4 pb-24 pt-6 md:pb-8">
      <h1 className="font-serif text-2xl font-bold">
        {t("History", "ประวัติ")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(
          "Your learning journey, sorted by time",
          "เส้นทางการเรียนของคุณ เรียงตามเวลา",
        )}
      </p>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {isLoading && entries.length === 0 ? (
        <div className="mt-16 flex justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("Loading history…", "กำลังโหลดประวัติ…")}
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-16 text-center text-sm text-muted-foreground">
          {t(
            "No history yet. Open a lesson from Explore or your library — it will appear here.",
            "ยังไม่มีประวัติการเรียน เปิดบทเรียนจากหน้าสำรวจหรือคลังของคุณ — จะแสดงที่นี่",
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {Object.entries(grouped).map(([label, rows]) => (
            <div key={label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {rows.map((row) => (
                  <div key={row._id} className="relative">
                    <ContentCard
                      title={row.content.title}
                      coverUrl={row.content.title_image || undefined}
                      topics={row.content.topics}
                      author={authorWithRelativeTime(row, t, isThai)}
                      onClick={() => navigate(`/view/${row.content._id}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
