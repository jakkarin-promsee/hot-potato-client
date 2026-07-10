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
                ? "border-violet-500 bg-violet-50 text-violet-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-violet-200",
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
