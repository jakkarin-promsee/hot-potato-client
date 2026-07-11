import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Copy,
  Images,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { callCreator } from "@/lib/creatorApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/axios";
import { useCanvasStore, type AgentSettings } from "@/stores/canvas.store";
import { useUploadStore } from "@/stores/cloudinary.store";
import { useEditorI18n } from "./editor.i18n";

/** Picker: all uploaded images in a grid; one click sets the title image and closes. */
const TitleImageGalleryModal = memo(
  ({
    onClose,
    onPick,
    currentUrl,
  }: {
    onClose: () => void;
    onPick: (url: string) => void;
    currentUrl: string;
  }) => {
    const { t } = useEditorI18n();
    const history = useUploadStore((s) => s.history);
    const isFetching = useUploadStore((s) => s.isFetching);
    const fetchHistory = useUploadStore((s) => s.fetchHistory);

    useEffect(() => {
      void fetchHistory();
    }, [fetchHistory]);

    return (
      <div className="fixed inset-0 z-90 flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          className="relative z-10 flex max-h-[78vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
            <div>
              <span className="text-sm font-semibold text-foreground">
                {t("Choose from gallery", "เลือกจากคลังรูปภาพ")}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Click an image to use it as the title image.",
                  "คลิกรูปภาพเพื่อใช้เป็นรูปปก",
                )}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {isFetching ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                {t("No images in your gallery yet. Use ", "ยังไม่มีรูปภาพในคลังของคุณ ใช้ ")}
                <span className="font-medium text-foreground">
                  {t("Upload", "อัปโหลด")}
                </span>{" "}
                {t("above first, then try again.", "ก่อน แล้วค่อยลองใหม่")}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {history.map((img) => {
                  const selected = currentUrl === img.secure_url;
                  return (
                    <button
                      key={img.public_id}
                      type="button"
                      title={img.original_filename}
                      onClick={() => {
                        onPick(img.secure_url);
                        onClose();
                      }}
                      className={[
                        "relative aspect-square overflow-hidden rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary ring-1 ring-primary/30"
                          : "border-transparent hover:border-border",
                      ].join(" ")}
                    >
                      <img
                        src={img.secure_url}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

TitleImageGalleryModal.displayName = "TitleImageGalleryModal";

type PublishSettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

const ACCESS_TYPES: Array<"public" | "link-only" | "private"> = [
  "public",
  "link-only",
  "private",
];

const ACCESS_TYPE_LABELS: Record<
  (typeof ACCESS_TYPES)[number],
  { en: string; th: string }
> = {
  public: { en: "Public", th: "สาธารณะ" },
  "link-only": { en: "Link only", th: "เฉพาะลิงก์" },
  private: { en: "Private", th: "ส่วนตัว" },
};

function PublishSettingsModal({ open, onClose }: PublishSettingsModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [collaboratorDraft, setCollaboratorDraft] = useState("");
  const [topicDraft, setTopicDraft] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [qrFullscreenSize, setQrFullscreenSize] = useState(480);
  // ✨ AI autofill (Tier 3.5.F) — fills the form fields; saving stays manual
  const [aiMetaLoading, setAiMetaLoading] = useState(false);
  const [aiMetaError, setAiMetaError] = useState(false);
  const [aiAgentLoading, setAiAgentLoading] = useState(false);
  const [aiAgentError, setAiAgentError] = useState(false);
  const [aiAgentReason, setAiAgentReason] = useState("");
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);

  const contentId = useCanvasStore((s) => s.contentId);
  const title = useCanvasStore((s) => s.title);
  const titleImage = useCanvasStore((s) => s.titleImage);
  const collaborators = useCanvasStore((s) => s.collaborators);
  const accessType = useCanvasStore((s) => s.accessType);
  const topics = useCanvasStore((s) => s.topics);
  const description = useCanvasStore((s) => s.description);
  const agentSettings = useCanvasStore((s) => s.agentSettings);
  const isSaving = useCanvasStore((s) => s.isSaving);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const setTitle = useCanvasStore((s) => s.setTitle);
  const setTitleImage = useCanvasStore((s) => s.setTitleImage);
  const setCollaborators = useCanvasStore((s) => s.setCollaborators);
  const setAccessType = useCanvasStore((s) => s.setAccessType);
  const setTopics = useCanvasStore((s) => s.setTopics);
  const setDescription = useCanvasStore((s) => s.setDescription);
  const setAgentSettings = useCanvasStore((s) => s.setAgentSettings);
  const saveContent = useCanvasStore((s) => s.saveContent);
  const forceSave = useCanvasStore((s) => s.forceSave);
  const loadContent = useCanvasStore((s) => s.loadContent);
  const upload = useUploadStore((s) => s.upload);
  const isUploading = useUploadStore((s) => s.isUploading);
  const { t } = useEditorI18n();
  const shareUrl = contentId
    ? `${window.location.origin}/view/${contentId}`
    : "";

  const resetLocalDrafts = useCallback(() => {
    setCollaboratorDraft("");
    setTopicDraft("");
  }, []);

  const requestClose = useCallback(() => {
    if (!isDirty) {
      resetLocalDrafts();
      onClose();
      return;
    }
    setCloseConfirmOpen(true);
  }, [isDirty, onClose, resetLocalDrafts]);

  const handleDiscardAndClose = useCallback(async () => {
    setCloseLoading(true);
    try {
      if (contentId) {
        await loadContent(contentId);
      }
      resetLocalDrafts();
      setCloseConfirmOpen(false);
      onClose();
    } finally {
      setCloseLoading(false);
    }
  }, [contentId, loadContent, onClose, resetLocalDrafts]);

  const handleSaveAndClose = useCallback(async () => {
    setCloseLoading(true);
    try {
      await saveContent();
      resetLocalDrafts();
      setCloseConfirmOpen(false);
      onClose();
    } finally {
      setCloseLoading(false);
    }
  }, [onClose, resetLocalDrafts, saveContent]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (closeConfirmOpen) {
        setCloseConfirmOpen(false);
        return;
      }
      if (qrFullscreen) setQrFullscreen(false);
      else if (galleryOpen) setGalleryOpen(false);
      else requestClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, galleryOpen, qrFullscreen, requestClose, closeConfirmOpen]);

  useEffect(() => {
    if (!open) {
      setGalleryOpen(false);
      setQrFullscreen(false);
      setCloseConfirmOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!qrFullscreen) return;
    const updateSize = () => {
      setQrFullscreenSize(
        Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.82),
      );
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [qrFullscreen]);

  const addCollaborator = () => {
    const next = collaboratorDraft.trim();
    if (!next) return;
    if (collaborators.includes(next)) {
      setCollaboratorDraft("");
      return;
    }
    setCollaborators([...collaborators, next]);
    setCollaboratorDraft("");
  };

  const updateCollaborator = (idx: number, value: string) => {
    const next = [...collaborators];
    next[idx] = value;
    setCollaborators(next);
  };

  const removeCollaborator = (idx: number) => {
    setCollaborators(collaborators.filter((_, i) => i !== idx));
  };

  const addTopic = () => {
    const next = topicDraft.trim();
    if (!next) return;
    setTopics([...topics, next]);
    setTopicDraft("");
  };

  const updateTopic = (idx: number, value: string) => {
    const next = [...topics];
    next[idx] = value;
    setTopics(next);
  };

  const removeTopic = (idx: number) => {
    setTopics(topics.filter((_, i) => i !== idx));
  };

  const handleUploadTitleImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const uploaded = await upload(file);
    if (uploaded?.secure_url) {
      setTitleImage(uploaded.secure_url);
    }
  };

  const handleCopyShare = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1600);
  };

  const handleDelete = async () => {
    if (!contentId) return;
    const yes = window.confirm(
      t(
        "Delete this content permanently? This action cannot be undone.",
        "ลบเนื้อหานี้ถาวรหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
      ),
    );
    if (!yes) return;

    setDeleteLoading(true);
    try {
      await api.delete(`/content/${contentId}`);
      onClose();
      navigate("/create");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    await saveContent();
  };

  // Empty fields fill silently; existing content asks one confirm first.
  const handleAutofillMeta = async () => {
    if (!contentId) return;
    setAiMetaLoading(true);
    setAiMetaError(false);
    try {
      const meta = await callCreator(contentId, "lesson_meta", {});
      const titleEmpty = !title.trim() || title.trim() === "Untitled";
      const descEmpty = !description.trim();
      const topicsEmpty = topics.length === 0;
      let overwrite = true;
      if (!titleEmpty || !descEmpty || !topicsEmpty) {
        overwrite = window.confirm(
          t(
            "Some fields already have content — overwrite them with the AI suggestion?",
            "มีข้อมูลเดิมอยู่บางช่อง เขียนทับด้วยของที่ AI แนะนำไหม?",
          ),
        );
      }
      if (titleEmpty || overwrite) setTitle(meta.title);
      if (descEmpty || overwrite) setDescription(meta.description);
      if (topicsEmpty || overwrite) setTopics(meta.topics);
    } catch {
      setAiMetaError(true);
    } finally {
      setAiMetaLoading(false);
    }
  };

  const handleSuggestAgentSettings = async () => {
    if (!contentId) return;
    setAiAgentLoading(true);
    setAiAgentError(false);
    try {
      const s = await callCreator(contentId, "agent_settings_suggest", {});
      const personaEmpty = !agentSettings.persona_note.trim();
      const guidelinesEmpty = !agentSettings.custom_guidelines.trim();
      let overwrite = true;
      if (!personaEmpty || !guidelinesEmpty) {
        overwrite = window.confirm(
          t(
            "You already wrote tutor settings — overwrite them with the AI suggestion?",
            "ครูตั้งค่าติวเตอร์ไว้แล้วบางส่วน เขียนทับด้วยของที่ AI แนะนำไหม?",
          ),
        );
      }
      setAgentSettings({
        persona_note:
          personaEmpty || overwrite
            ? s.persona_note
            : agentSettings.persona_note,
        custom_guidelines:
          guidelinesEmpty || overwrite
            ? s.custom_guidelines
            : agentSettings.custom_guidelines,
        scope: overwrite ? s.scope : agentSettings.scope,
        allow_direct_answers: overwrite
          ? s.allow_direct_answers
          : agentSettings.allow_direct_answers,
      });
      setAiAgentReason(s.reason);
    } catch {
      setAiAgentError(true);
    } finally {
      setAiAgentLoading(false);
    }
  };

  const handlePublishNow = async () => {
    if (!contentId) return;
    if (accessType === "private") setAccessType("public");
    await forceSave();
    const id = useCanvasStore.getState().contentId;
    onClose();
    if (id) navigate(`/view/${id}`);
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-80 flex items-center justify-center bg-black/60 p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) requestClose();
        }}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border bg-background px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">
              {t("Publish settings", "ตั้งค่าการเผยแพร่")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "Configure visibility, collaborators, and discoverability.",
                "ตั้งค่าการมองเห็น ผู้ร่วมงาน และการค้นพบ",
              )}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={requestClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleAutofillMeta()}
              disabled={aiMetaLoading || !contentId}
              className="gap-2 border-primary/40 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-30"
            >
              {aiMetaLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {t(
                "AI autofill: title · description · topics",
                "ให้ AI ช่วยกรอก ชื่อ · คำอธิบาย · หัวข้อ",
              )}
            </Button>
            {aiMetaError && (
              <p className="mt-1.5 text-xs text-amber-700">
                {t("AI is busy, try again 🥔", "AI ไม่ว่างแป๊บนึง ลองอีกทีนะ 🥔")}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>{t("Title", "ชื่อเรื่อง")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("Lesson title", "ชื่อบทเรียน")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("Title image URL", "ลิงก์รูปปก")}</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={() => setGalleryOpen(true)}
            >
              <Images className="size-3.5" />
              {t("Choose from gallery", "เลือกจากคลังรูปภาพ")}
            </Button>
            <div className="flex gap-2">
              <Input
                value={titleImage}
                onChange={(e) => setTitleImage(e.target.value)}
                placeholder="https://..."
                className="min-w-0 flex-1"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadTitleImage}
              />
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {t("Upload", "อัปโหลด")}
              </Button>
            </div>
            {titleImage && (
              <img
                src={titleImage}
                alt="Title preview"
                className="mt-2 h-28 w-full rounded-lg border border-border object-cover"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("Access type", "ประเภทการเข้าถึง")}</Label>
            <div className="flex flex-wrap gap-2">
              {ACCESS_TYPES.map((type) => (
                <Button
                  key={type}
                  variant={accessType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAccessType(type)}
                >
                  {t(ACCESS_TYPE_LABELS[type].en, ACCESS_TYPE_LABELS[type].th)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("Collaborators (User ID)", "ผู้ร่วมงาน (User ID)")}</Label>
            <div className="flex gap-2">
              <Input
                value={collaboratorDraft}
                onChange={(e) => setCollaboratorDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCollaborator();
                  }
                }}
                placeholder="64f2... user id"
              />
              <Button variant="outline" onClick={addCollaborator}>
                <Plus className="size-4" />
                {t("Add", "เพิ่ม")}
              </Button>
            </div>
            <div className="space-y-2">
              {collaborators.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("No collaborators yet.", "ยังไม่มีผู้ร่วมงาน")}
                </p>
              )}
              {collaborators.map((id, idx) => (
                <div key={`${id}-${idx}`} className="flex gap-2">
                  <Input
                    value={id}
                    onChange={(e) => updateCollaborator(idx, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeCollaborator(idx)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("Topics", "หัวข้อ")}</Label>
            <div className="flex gap-2">
              <Input
                value={topicDraft}
                onChange={(e) => setTopicDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopic();
                  }
                }}
                placeholder={t("Math, Biology, ...", "คณิต, ชีวะ, ...")}
              />
              <Button variant="outline" onClick={addTopic}>
                <Plus className="size-4" />
                {t("Add", "เพิ่ม")}
              </Button>
            </div>
            <div className="space-y-2">
              {topics.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("No topics yet.", "ยังไม่มีหัวข้อ")}
                </p>
              )}
              {topics.map((topic, idx) => (
                <div key={`${topic}-${idx}`} className="flex gap-2">
                  <Input
                    value={topic}
                    onChange={(e) => updateTopic(idx, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeTopic(idx)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>{t("Description", "คำอธิบาย")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(
                "Write a longer description for this content...",
                "เขียนคำอธิบายเนื้อหานี้แบบละเอียด...",
              )}
              className="min-h-24"
            />
          </div>

          <div className="mt-2 space-y-4 border-t-2 border-border pt-5 md:col-span-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t("AI Tutor", "AI ติวเตอร์")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Shape how the AI tutor behaves in this lesson. Leave blank to use the friendly default.",
                  "ปรับพฤติกรรม AI ติวเตอร์ของบทเรียนนี้ เว้นว่างไว้เพื่อใช้ค่าเริ่มต้นที่เป็นมิตร",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSuggestAgentSettings()}
                disabled={aiAgentLoading || !contentId}
                className="mt-2 gap-2 border-primary/40 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-30"
              >
                {aiAgentLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {t(
                  "AI suggest tutor settings",
                  "ให้ AI แนะนำการตั้งค่าติวเตอร์",
                )}
              </Button>
              {aiAgentError && (
                <p className="mt-1.5 text-xs text-amber-700">
                  {t("AI is busy, try again 🥔", "AI ไม่ว่างแป๊บนึง ลองอีกทีนะ 🥔")}
                </p>
              )}
              {aiAgentReason && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  💡 {t("Why: ", "เหตุผลจาก AI: ")}
                  {aiAgentReason}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                {t("Tutor personality (optional)", "บุคลิกของติวเตอร์ (ไม่บังคับ)")}
              </Label>
              <Input
                value={agentSettings.persona_note}
                maxLength={500}
                onChange={(e) =>
                  setAgentSettings({
                    ...agentSettings,
                    persona_note: e.target.value,
                  })
                }
                placeholder={t(
                  'e.g. "Talk like a sports coach"',
                  'เช่น "พูดเหมือนโค้ชกีฬา"',
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("Answer style", "สไตล์การให้คำตอบ")}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={!agentSettings.allow_direct_answers ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setAgentSettings({
                      ...agentSettings,
                      allow_direct_answers: false,
                    })
                  }
                >
                  {t("Coach first (recommended)", "ชวนคิดก่อน (แนะนำ)")}
                </Button>
                <Button
                  type="button"
                  variant={agentSettings.allow_direct_answers ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setAgentSettings({
                      ...agentSettings,
                      allow_direct_answers: true,
                    })
                  }
                >
                  {t("May answer directly", "บอกคำตอบตรงๆ ได้")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Coach first: the AI guides with hints before revealing answers.",
                  "ชวนคิดก่อน: AI จะใบ้และชวนคิดก่อนเฉลย",
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("Chat scope", "ขอบเขตการคุย")}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={
                    agentSettings.scope === "lesson_plus_general" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setAgentSettings({
                      ...agentSettings,
                      scope: "lesson_plus_general",
                    })
                  }
                >
                  {t("Lesson + general knowledge", "บทเรียน + ความรู้ทั่วไป")}
                </Button>
                <Button
                  type="button"
                  variant={
                    agentSettings.scope === "lesson_only" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setAgentSettings({
                      ...agentSettings,
                      scope: "lesson_only",
                    })
                  }
                >
                  {t("This lesson only", "เฉพาะบทเรียนนี้")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {t("Extra guidance for the AI (optional)", "แนวทางเพิ่มเติมให้ AI (ไม่บังคับ)")}
              </Label>
              <Textarea
                value={agentSettings.custom_guidelines}
                maxLength={1000}
                onChange={(e) =>
                  setAgentSettings({
                    ...agentSettings,
                    custom_guidelines: e.target.value,
                  } satisfies AgentSettings)
                }
                className="min-h-20"
              />
            </div>
          </div>

          <div className="mt-2 space-y-4 border-t-2 border-border pt-5 md:col-span-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t("Sharing", "การแชร์")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Students scan the QR code to open this lesson, or use the link below.",
                  "ให้นักเรียนสแกน QR code เพื่อเปิดบทเรียนนี้ หรือใช้ลิงก์ด้านล่าง",
                )}
              </p>
            </div>

            {contentId ? (
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => setQrFullscreen(true)}
                  title={t("Tap to enlarge QR code", "แตะเพื่อขยาย QR code")}
                  className="rounded-xl border border-border bg-white p-4 transition hover:border-primary/50 hover:shadow-md"
                >
                  <QRCodeSVG
                    value={shareUrl}
                    size={180}
                    level="M"
                    marginSize={0}
                  />
                </button>
                <p className="text-[11px] text-muted-foreground">
                  {t("Tap the QR code to show it full screen", "แตะ QR code เพื่อขยายเต็มจอ")}
                </p>

                <div className="w-full space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("Public link", "ลิงก์สาธารณะ")}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyShare}
                      className="shrink-0 gap-2"
                    >
                      {shareCopied ? (
                        <Check className="size-4 text-green-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      {shareCopied
                        ? t("Copied", "คัดลอกแล้ว")
                        : t("Copy", "คัดลอก")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t(
                  "Save the lesson first to get a shareable link.",
                  "บันทึกบทเรียนก่อน แล้วจะได้ลิงก์สำหรับแชร์",
                )}
              </p>
            )}
          </div>
        </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!contentId || deleteLoading}
          >
            {deleteLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {t("Delete", "ลบ")}
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("Save settings", "บันทึกการตั้งค่า")}
            </Button>
            <Button
              onClick={handlePublishNow}
              disabled={isSaving || !contentId}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("Publish now", "เผยแพร่ตอนนี้")}
            </Button>
          </div>
        </div>
      </div>
      </div>
      {qrFullscreen && shareUrl && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/90 p-6">
          <button
            type="button"
            aria-label={t("Close", "ปิด")}
            className="absolute inset-0"
            onClick={() => setQrFullscreen(false)}
          />
          <button
            type="button"
            onClick={() => setQrFullscreen(false)}
            className="relative z-10 mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
          <div
            className="relative z-10 rounded-2xl bg-white p-6 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <QRCodeSVG
              value={shareUrl}
              size={qrFullscreenSize}
              level="M"
              marginSize={2}
            />
          </div>
          <p className="relative z-10 mt-5 max-w-md text-center text-sm text-white/80">
            {t(
              "Point the camera at this code to open the lesson",
              "ให้นักเรียนสแกนโค้ดนี้เพื่อเปิดบทเรียน",
            )}
          </p>
        </div>
      )}
      {galleryOpen && (
        <TitleImageGalleryModal
          currentUrl={titleImage}
          onPick={(url) => setTitleImage(url)}
          onClose={() => setGalleryOpen(false)}
        />
      )}
      {closeConfirmOpen && (
        <div
          className="fixed inset-0 z-90 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCloseConfirmOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">
              {t("Do you want to save?", "ต้องการบันทึกหรือไม่?")}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t(
                "You have unsaved changes in publish settings.",
                "มีการแก้ไขการตั้งค่าการเผยแพร่ที่ยังไม่ได้บันทึก",
              )}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCloseConfirmOpen(false)}
                disabled={closeLoading}
              >
                {t("Cancel", "ยกเลิก")}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleDiscardAndClose()}
                disabled={closeLoading}
              >
                {closeLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("Don't save", "ไม่บันทึก")}
              </Button>
              <Button
                onClick={() => void handleSaveAndClose()}
                disabled={closeLoading}
              >
                {closeLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("Save", "บันทึก")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PublishSettingsModal;
