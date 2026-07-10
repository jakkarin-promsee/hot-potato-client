import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/theme.store";
import { useAppI18n } from "@/lib/i18n";

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { t } = useAppI18n();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon" : "sm"}
      onClick={toggleTheme}
      className={compact ? "text-muted-foreground" : "gap-2"}
      aria-label={t(
        "Toggle light and dark theme",
        "สลับโหมดสว่างและโหมดมืด",
      )}
      title={
        isDark
          ? t("Switch to light mode", "เปลี่ยนเป็นโหมดสว่าง")
          : t("Switch to dark mode", "เปลี่ยนเป็นโหมดมืด")
      }
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && (
        <span>
          {isDark
            ? t("Light mode", "โหมดสว่าง")
            : t("Dark mode", "โหมดมืด")}
        </span>
      )}
    </Button>
  );
}
