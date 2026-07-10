/**
 * Tappable follow-up question chips — the tutor's `suggestions[]` from the
 * latest reply. Tapping a chip sends it immediately as the student message.
 * Renders nothing when there are no suggestions (never show placeholders).
 */
interface SuggestionChipsProps {
  suggestions: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
  /** `wrap` (default) stacks chips; `scroll` is a single horizontal swipe row. */
  layout?: "wrap" | "scroll";
}

export default function SuggestionChips({
  suggestions,
  onPick,
  disabled = false,
  layout = "wrap",
}: SuggestionChipsProps) {
  const chips = suggestions.map((s) => s.trim()).filter(Boolean);
  if (chips.length === 0) return null;

  const isScroll = layout === "scroll";

  return (
    <div
      className={
        isScroll
          ? "-mx-4 flex flex-nowrap gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
          : "flex flex-wrap gap-1.5"
      }
      data-testid="suggestion-chips"
      data-layout={layout}
    >
      {chips.map((chip, i) => (
        <button
          key={`${i}-${chip}`}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip)}
          onMouseDown={(e) => e.stopPropagation()}
          className={`min-h-11 rounded-2xl border border-violet-300 bg-white px-3 py-2 text-left text-sm font-medium text-violet-700 transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40${isScroll ? " shrink-0 whitespace-nowrap" : ""}`}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
