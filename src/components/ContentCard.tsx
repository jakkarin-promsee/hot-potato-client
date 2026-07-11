import { Bookmark } from "lucide-react";

interface ContentCardProps {
  title: string;
  coverUrl?: string;
  topics?: string[];
  author?: string;
  onClick?: () => void;
  onBookmark?: () => void;
  bookmarked?: boolean;
}

export function ContentCard({
  title,
  coverUrl,
  topics,
  author,
  onClick,
  onBookmark,
  bookmarked,
}: ContentCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-ring text-left cursor-pointer"
    >
      {/* Cover */}
      <div className="aspect-3/4 w-full overflow-hidden bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/20 to-accent">
            <span className="font-serif text-2xl text-muted-foreground/40">
              {title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-card-foreground">
          {title}
        </h3>
        {topics && topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {topics.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto">
          {author && <p className="text-xs text-muted-foreground">{author}</p>}
        </div>
      </div>

      {/* Bookmark */}
      {onBookmark && (
        <button
          type="button"
          aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
          onClick={(e) => {
            e.stopPropagation();
            onBookmark();
          }}
          className="absolute right-2 top-2 rounded-full bg-background/60 p-1.5 backdrop-blur-sm transition-colors hover:bg-background/80"
        >
          <Bookmark
            className={`h-3.5 w-3.5 ${bookmarked ? "fill-primary text-primary" : "text-foreground/60"}`}
          />
        </button>
      )}
    </div>
  );
}
