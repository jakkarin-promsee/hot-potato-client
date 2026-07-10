import { Globe } from "lucide-react";
import { useLanguageStore, type AppLanguage } from "@/stores/language.store";
import { useAppI18n } from "@/lib/i18n";

interface LanguageToggleProps {
  compact?: boolean;
}

const options: { value: AppLanguage; labelEn: string; labelTh: string }[] = [
  { value: "en", labelEn: "EN", labelTh: "EN" },
  { value: "th", labelEn: "TH", labelTh: "TH" },
];

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const { t } = useAppI18n();

  return (
    <div
      className={
        compact
          ? "inline-flex items-center gap-1 rounded-md border border-border p-0.5"
          : "inline-flex items-center gap-2 rounded-md border border-border p-1"
      }
      role="group"
      aria-label={t("Language", "ภาษา")}
    >
      {!compact && (
        <Globe className="ml-1 h-4 w-4 text-muted-foreground" aria-hidden />
      )}
      {options.map(({ value, labelEn, labelTh }) => {
        const active = language === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLanguage(value)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
            aria-pressed={active}
            aria-label={
              value === "en"
                ? t("English", "อังกฤษ")
                : t("Thai", "ไทย")
            }
          >
            {t(labelEn, labelTh)}
          </button>
        );
      })}
    </div>
  );
}
