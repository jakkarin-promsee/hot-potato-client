import { useEffect, useRef, useState } from "react";
import { Save, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { applyTransform, uploadImage } from "@/lib/cloudinary";
import { useAppI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth.store";
import { useProfileStore } from "@/stores/profile.store";
import { TutorMemoryCard } from "@/components/TutorMemoryCard";
import {
  TUTOR_PERSONALITY_CATALOG,
  useTutorPersonalityStore,
} from "@/stores/tutorPersonality.store";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function Profile() {
  const navigate = useNavigate();
  const { isThai, t } = useAppI18n();
  const user = useAuthStore((s) => s.user);
  const { profile, isLoading, isSaving, error, fetchProfile, saveProfile } =
    useProfileStore();

  const personalityId = useTutorPersonalityStore((s) => s.personality);
  const currentPersonality =
    TUTOR_PERSONALITY_CATALOG.find((p) => p.id === personalityId) ??
    TUTOR_PERSONALITY_CATALOG[0];

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname);
      setBio(profile.bio);
    }
    if (user) {
      setName(user.name);
    }
  }, [profile, user]);

  const hasChanges =
    profile !== null &&
    (name.trim() !== (user?.name ?? "") ||
      nickname !== profile.nickname ||
      bio !== profile.bio);

  const avatarLetter =
    nickname?.[0]?.toUpperCase() ||
    name?.[0]?.toUpperCase() ||
    "U";

  const handleSave = async () => {
    const changes: Partial<{
      name: string;
      bio: string;
      nickname: string;
    }> = {};

    if (name.trim() !== (user?.name ?? "")) changes.name = name.trim();
    if (profile && nickname !== profile.nickname) changes.nickname = nickname;
    if (profile && bio !== profile.bio) changes.bio = bio;

    if (Object.keys(changes).length === 0) return;

    try {
      await saveProfile(changes);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      // error shown via store
    }
  };

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError(t("Please choose an image file.", "กรุณาเลือกไฟล์รูปภาพ"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setUploadError(
        t("Image must be 5 MB or smaller.", "รูปภาพต้องไม่เกิน 5 MB"),
      );
      return;
    }

    setUploadProgress(0);
    try {
      const result = await uploadImage(file, {
        onProgress: (pct) => setUploadProgress(pct),
      });
      await saveProfile({ avatar: result.secure_url });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      setUploadError(
        t(
          "Avatar upload failed. Please try again.",
          "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง",
        ),
      );
    } finally {
      setUploadProgress(null);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="container flex min-h-[40vh] max-w-lg items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="container max-w-lg px-4 pb-12 pt-6 text-center">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
        <Button className="mt-4" variant="outline" onClick={() => fetchProfile()}>
          {t("Retry", "ลองอีกครั้ง")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-lg px-4 pb-12 pt-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative">
          {profile?.avatar ? (
            <img
              src={applyTransform(profile.avatar, "w_150,h_150,c_fill")}
              alt={t("Profile avatar", "รูปโปรไฟล์")}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
              <span className="font-serif text-2xl font-bold text-primary">
                {avatarLetter}
              </span>
            </div>
          )}
          {uploadProgress !== null && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 text-xs font-medium">
              {uploadProgress}%
            </div>
          )}
          <button
            type="button"
            onClick={handleAvatarPick}
            disabled={isSaving || uploadProgress !== null}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("Tap to change avatar", "แตะเพื่อเปลี่ยนรูปโปรไฟล์")}
        </p>
        {uploadError && (
          <p className="text-xs text-destructive" role="alert">
            {uploadError}
          </p>
        )}
        {user?.email && (
          <p className="text-xs text-muted-foreground">{user.email}</p>
        )}
      </div>

      {/* Form */}
      <div className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs text-muted-foreground">
            {t("Display name", "ชื่อที่แสดง")}
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Your name", "ชื่อของคุณ")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nickname" className="text-xs text-muted-foreground">
            {t("Nickname", "ชื่อเล่น")}
          </Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t(
              "What should friends call you?",
              "ให้เพื่อน ๆ เรียกว่าอะไร",
            )}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio" className="text-xs text-muted-foreground">
              {t("Bio", "เกี่ยวกับคุณ")}
            </Label>
            <span className="text-[10px] text-muted-foreground">
              {bio.length}/500
            </span>
          </div>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t(
              "Tell us a bit about yourself...",
              "เล่าเกี่ยวกับตัวคุณสักเล็กน้อย...",
            )}
            rows={3}
            maxLength={500}
            className="resize-none"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => navigate("/change-password")}
        >
          {t("Change password", "เปลี่ยนรหัสผ่าน")}
        </Button>

        <div className="flex items-center gap-3">
          <Button
            className="flex-1 gap-2"
            disabled={isSaving || !hasChanges}
            onClick={handleSave}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("Save changes", "บันทึกการเปลี่ยนแปลง")}
          </Button>
          {savedFlash && (
            <span className="text-sm text-green-600 dark:text-green-400">
              {t("Saved ✓", "บันทึกแล้ว ✓")}
            </span>
          )}
        </div>

        {error && profile && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Tutor section (Tier 3.B) */}
      <div className="mt-10 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("Your AI tutor", "ติวเตอร์ของคุณ")}
        </h2>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("Tutor personality", "บุคลิกติวเตอร์")}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentPersonality.emoji}{" "}
              {isThai ? currentPersonality.labelTh : currentPersonality.labelEn}
            </p>
          </div>
          <Link
            to="/settings"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("Change", "เปลี่ยน")}
          </Link>
        </div>

        <TutorMemoryCard />
      </div>
    </div>
  );
}
