import {
  Bell,
  Moon,
  Globe,
  Shield,
  Trash2,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useLanguageStore } from "@/stores/language.store";
import PersonalityPicker from "@/components/editor/extensions/PersonalityPicker";
import { useTutorPersonalityStore } from "@/stores/tutorPersonality.store";

interface SettingRow {
  icon: React.ElementType;
  label: string;
  description: string;
  destructive?: boolean;
}

export default function Settings() {
  const { theme } = useThemeStore();
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const navigate = useNavigate();
  const isThai = language === "th";
  const t = (enText: string, thText: string) => (isThai ? thText : enText);

  const sections: { heading: string; items: SettingRow[] }[] = [
    {
      heading: t("Preferences", "การตั้งค่า"),
      items: [
        {
          icon: Bell,
          label: t("Notifications", "การแจ้งเตือน"),
          description: t("Push & email alerts", "การแจ้งเตือนผ่านแอปและอีเมล"),
        },
        {
          icon: Moon,
          label: t("Appearance", "หน้าตาแอป"),
          description: "Theme, font size, display",
        },
      ],
    },
    {
      heading: t("Account", "บัญชี"),
      items: [
        {
          icon: Shield,
          label: t("Privacy & Security", "ความเป็นส่วนตัวและความปลอดภัย"),
          description: t("Password, 2FA, sessions", "รหัสผ่าน, 2FA, เซสชัน"),
        },
        {
          icon: HelpCircle,
          label: t("Help & Support", "ช่วยเหลือและสนับสนุน"),
          description: t("FAQ, contact us", "คำถามที่พบบ่อย, ติดต่อเรา"),
        },
      ],
    },
    ...(token
      ? [
          {
            heading: t("Danger zone", "โซนอันตราย"),
            items: [
              {
                icon: LogOut,
                label: t("Log out", "ออกจากระบบ"),
                description: t("Sign out of your account", "ออกจากบัญชีของคุณ"),
                destructive: true,
              },
              {
                icon: Trash2,
                label: t("Delete account", "ลบบัญชี"),
                description: t(
                  "Permanently remove your data",
                  "ลบข้อมูลของคุณอย่างถาวร",
                ),
                destructive: true,
              },
            ],
          },
        ]
      : []),
  ];

  const handleLogout = () => {
    logout();
    navigate("/explore", { replace: true });
  };

  return (
    <div className="container max-w-lg px-4 pb-12 pt-6">
      <h1 className="font-serif text-2xl font-bold">{t("Settings", "ตั้งค่า")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("Manage your account and preferences", "จัดการบัญชีและการตั้งค่าของคุณ")}
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Appearance", "หน้าตาแอป")}
          </h2>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("Appearance", "หน้าตาแอป")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("Current mode", "โหมดปัจจุบัน")}:{" "}
                {theme === "dark" ? t("Dark", "มืด") : t("Light", "สว่าง")}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Language", "ภาษา")}
          </h2>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("Language", "ภาษา")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("App display language", "ภาษาที่ใช้แสดงผลในแอป")}
                </p>
              </div>
            </div>
            <div className="inline-flex rounded-md border border-border p-1">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  !isThai
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {t("English", "อังกฤษ")}
              </button>
              <button
                type="button"
                onClick={() => setLanguage("th")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  isThai
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {t("Thai", "ไทย")}
              </button>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("AI Tutor", "AI ติวเตอร์")}
          </h2>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {t("Choose how the tutor talks to you", "เลือกสไตล์การคุยของติวเตอร์")}
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              {t(
                "Applies to every AI chat in lessons.",
                "มีผลกับการคุย AI ทุกจุดในบทเรียน",
              )}
            </p>
            <PersonalityPicker />
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.heading}
            </h2>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={
                    item.label === t("Log out", "ออกจากระบบ")
                      ? handleLogout
                      : undefined
                  }
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 ${
                      item.destructive
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        item.destructive
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
