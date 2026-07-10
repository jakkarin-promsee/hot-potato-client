import { useState } from "react";
import {
  Globe,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Type,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useLanguageStore } from "@/stores/language.store";
import {
  useAppearanceStore,
  FONT_SIZE_OPTIONS,
} from "@/stores/appearance.store";
import PersonalityPicker from "@/components/editor/extensions/PersonalityPicker";
import { useAppI18n } from "@/lib/i18n";
import { OWNER_FACEBOOK_URL } from "@/lib/contact";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { theme } = useThemeStore();
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const fontSize = useAppearanceStore((s) => s.fontSize);
  const setFontSize = useAppearanceStore((s) => s.setFontSize);
  const navigate = useNavigate();
  const { isThai, t } = useAppI18n();
  const [helpOpen, setHelpOpen] = useState(false);

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
        {/* Appearance: theme + font size */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Appearance", "หน้าตาแอป")}
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("Theme", "ธีม")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Current mode", "โหมดปัจจุบัน")}:{" "}
                  {theme === "dark" ? t("Dark", "มืด") : t("Light", "สว่าง")}
                </p>
              </div>
              <ThemeToggle />
            </div>

            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <Type className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("Font size", "ขนาดตัวอักษร")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Applies to the whole app", "มีผลกับตัวหนังสือทั้งแอป")}
                  </p>
                </div>
              </div>
              <div className="mt-3 inline-flex flex-wrap gap-1 rounded-md border border-border p-1">
                {FONT_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFontSize(option.id)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      fontSize === option.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {isThai ? option.labelTh : option.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Language */}
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
                  language === "en"
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
                  language === "th"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {t("Thai", "ไทย")}
              </button>
            </div>
          </div>
        </div>

        {/* AI Tutor personality */}
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

        {/* Account */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Account", "บัญชี")}
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {token && (
              <button
                type="button"
                onClick={() => navigate("/change-password")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t("Password", "รหัสผ่าน")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Change your password", "เปลี่ยนรหัสผ่านของคุณ")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                token ? "border-t border-border" : ""
              }`}
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t("Help & Support", "ช่วยเหลือและสนับสนุน")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Contact & status", "ติดต่อเราและสถานะระบบ")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Danger zone — logged-in only (Delete account returns with Tier 6.A) */}
        {token && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("Danger zone", "โซนอันตราย")}
            </h2>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <LogOut className="h-4 w-4 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-destructive">
                    {t("Log out", "ออกจากระบบ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Sign out of your account", "ออกจากบัญชีของคุณ")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help & Support popup */}
      <AlertDialog open={helpOpen} onOpenChange={setHelpOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Help & Support", "ช่วยเหลือและสนับสนุน")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Hot Potato is built and run for free by one person 😄 Found a bug or have an idea? Message me directly:",
                "เว็บนี้ทำฟรีโดยคนคนเดียว 😄 เจอปัญหาหรือมีไอเดียอะไร ทักมาคุยกันได้เลย:",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <a
            href={OWNER_FACEBOOK_URL}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            {t("Message me on Facebook", "ทักแชทผ่าน Facebook")}
          </a>
          <p className="text-xs text-muted-foreground">
            {t("Think the site is down?", "สงสัยว่าเว็บล่มไหม?")}{" "}
            <Link
              to="/status"
              onClick={() => setHelpOpen(false)}
              className="text-primary underline underline-offset-4"
            >
              {t("Check the status page", "เช็กหน้าสถานะระบบ")}
            </Link>
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Close", "ปิด")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
