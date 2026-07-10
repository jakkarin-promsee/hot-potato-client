import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight, Loader2 } from "lucide-react";
import { ContentCard } from "@/components/ContentCard";
import { Link, useNavigate } from "react-router-dom";
import { useContentStore } from "@/stores/content.store";
import { useLearningHistoryStore } from "@/stores/learningHistory.store";
import { useAuthStore } from "@/stores/auth.store";
import { formatAuthorLine } from "@/lib/formatAuthors";
import { useBookmarkStore } from "@/stores/bookmark.store";

const TABS = ["All", "Bookmarked", "Recent"] as const;

const RECENT_MS = 14 * 24 * 60 * 60 * 1000;

export default function Explore() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All");
  const [search, setSearch] = useState("");
  const bookmarkIds = useBookmarkStore((s) => s.ids);
  const toggleBookmark = useBookmarkStore((s) => s.toggle);
  const hasBookmark = useBookmarkStore((s) => s.has);
  const {
    exploreContents,
    exploreLoading,
    error,
    fetchExploreContents,
    searchExploreContents,
  } = useContentStore();

  const {
    entries: historyEntries,
    isLoading: historyLoading,
    error: historyError,
    fetchHistory,
  } = useLearningHistoryStore();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    fetchExploreContents();
  }, [fetchExploreContents]);

  useEffect(() => {
    if (token) fetchHistory(6);
  }, [token, fetchHistory]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search.trim()) {
        searchExploreContents(search);
      } else {
        fetchExploreContents();
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [search, searchExploreContents, fetchExploreContents]);

  const validContents = useMemo(
    () =>
      exploreContents.filter(
        (c) =>
          Boolean(c?._id) && Boolean(c?.title && c.title.trim().length > 0),
      ),
    [exploreContents],
  );

  const continueLearning = useMemo(
    () => historyEntries.slice(0, 6),
    [historyEntries],
  );

  const displayed = useMemo(() => {
    if (activeTab === "Bookmarked") {
      return validContents.filter((c) => hasBookmark(c._id));
    }
    if (activeTab === "Recent") {
      const cutoff = Date.now() - RECENT_MS;
      return validContents.filter(
        (c) => new Date(c.updatedAt).getTime() >= cutoff,
      );
    }
    return validContents;
  }, [activeTab, validContents, bookmarkIds, hasBookmark]);

  return (
    <div className="container px-4 pb-24 pt-6 md:pb-8">
      <h1 className="font-serif text-2xl font-bold">Explore</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Discover public lessons crafted for understanding
      </p>

      {(error || historyError) && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error ?? historyError}
        </p>
      )}

      {/* Continue learning – from signed-in user's history */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Continue learning
          </h2>
          <Link
            to="/history"
            className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-2 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {historyLoading && continueLearning.length === 0 ? (
            <div className="flex h-40 w-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : continueLearning.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No history yet. Open any lesson you can access — it will show up
              here. Browse public lessons below to get started.
            </p>
          ) : (
            continueLearning.map((row) => (
              <div key={row._id} className="w-48 shrink-0">
                <ContentCard
                  title={row.content.title}
                  coverUrl={row.content.title_image || undefined}
                  topics={row.content.topics}
                  author={formatAuthorLine(
                    row.content.author_name,
                    row.content.collaborator_names,
                  )}
                  onClick={() => navigate(`/view/${row.content._id}`)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search public lessons..."
          className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {exploreLoading && displayed.length === 0 ? (
          <div className="col-span-full flex justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading lessons…
          </div>
        ) : (
          displayed.map((c) => (
            <ContentCard
              key={c._id}
              title={c.title}
              coverUrl={c.title_image}
              topics={c.topics}
              author={formatAuthorLine(c.author_name, c.collaborator_names)}
              bookmarked={hasBookmark(c._id)}
              onBookmark={() => toggleBookmark(c._id)}
              onClick={() => navigate(`/view/${c._id}`)}
            />
          ))
        )}
      </div>

      {!exploreLoading && displayed.length === 0 && (
        <div className="mt-16 text-center text-sm text-muted-foreground">
          {activeTab === "Bookmarked"
            ? "No bookmarked lessons yet."
            : activeTab === "Recent"
              ? "No lessons updated in the last 14 days."
              : search.trim()
                ? "No public lessons match your search."
                : "No public lessons found."}
        </div>
      )}
    </div>
  );
}
