import { useLanguageStore } from "@/stores/language.store";
import { useTutorPersonalityStore, TUTOR_PERSONALITY_CATALOG } from "@/stores/tutorPersonality.store";

export default function PersonalityPicker() {
  const language = useLanguageStore((s) => s.language);
  const personality = useTutorPersonalityStore((s) => s.personality);
  const setPersonality = useTutorPersonalityStore((s) => s.setPersonality);
  const isThai = language === "th";

  return (
    <div className="flex flex-wrap gap-2">
      {TUTOR_PERSONALITY_CATALOG.map((preset) => {
        const selected = personality === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => setPersonality(preset.id)}
            className={[
              "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
              selected
                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/25"
                : "border-border bg-muted/50 text-foreground hover:border-primary/40 hover:bg-accent",
            ].join(" ")}
          >
            <span aria-hidden>{preset.emoji}</span>
            <span>{isThai ? preset.labelTh : preset.labelEn}</span>
          </button>
        );
      })}
    </div>
  );
}
