import { useState, useEffect, useCallback, memo } from "react";
import { Editor } from "@tiptap/react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  ChevronLeft,
  Undo2,
  Redo2,
  Save,
  Loader2,
  Link2,
  ZoomIn,
  ZoomOut,
  Zap,
  ZapOff,
} from "lucide-react";
import { useCanvasStore } from "@/stores/canvas.store";
import PublishSettingsModal from "./PublishSettingsModal";
import AiWritingAssistant from "./ai/AiWritingAssistant";
import AiCriticButton from "./ai/AiCriticButton";
import { useEditorI18n } from "./editor.i18n";

const IconBtn = memo(
  ({
    onClick,
    disabled = false,
    title: tip,
    children,
  }: {
    onClick: () => void;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tip}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  ),
);

interface EditorHeaderProps {
  editor: Editor | null;
  linkClickMode: "ctrl" | "direct";
  onLinkClickModeChange: (mode: "ctrl" | "direct") => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  /** Lifted up so sidebars can gate their own listeners on this too */
  dynamicUpdate: boolean;
  onDynamicUpdateChange: (enabled: boolean) => void;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.25;

const EditorHeader = memo(
  ({
    editor,
    linkClickMode,
    onLinkClickModeChange,
    zoom,
    onZoomChange,
    dynamicUpdate,
    onDynamicUpdateChange,
  }: EditorHeaderProps) => {
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [zoomInputFocused, setZoomInputFocused] = useState(false);
    const [zoomInputValue, setZoomInputValue] = useState(
      String(Math.round(zoom * 100)),
    );
    const title = useCanvasStore((s) => s.title);
    const isSaving = useCanvasStore((s) => s.isSaving);
    const isDirty = useCanvasStore((s) => s.isDirty);
    const setTitle = useCanvasStore((s) => s.setTitle);
    const saveContent = useCanvasStore((s) => s.saveContent);
    const { isThai } = useEditorI18n();

    const handleTitleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value); // ✅ goes to store now
      },
      [setTitle],
    );

    // Wire real save to save button
    const handleSave = useCallback(() => {
      saveContent(); // ✅ was empty before
    }, [saveContent]);

    useEffect(() => {
      if (!zoomInputFocused) setZoomInputValue(String(Math.round(zoom * 100)));
    }, [zoom, zoomInputFocused]);

    // Undo/redo — always live (only 2 cheap checks, not worth gating)
    useEffect(() => {
      if (!editor) return;
      const update = () => {
        setCanUndo(editor.can().undo());
        setCanRedo(editor.can().redo());
      };
      update();
      editor.on("transaction", update);
      return () => {
        editor.off("transaction", update);
      };
    }, [editor]);

    const handleUndo = useCallback(
      () => editor?.chain().focus().undo().run(),
      [editor],
    );
    const handleRedo = useCallback(
      () => editor?.chain().focus().redo().run(),
      [editor],
    );
    const handleLinkToggle = useCallback(() => {
      onLinkClickModeChange(linkClickMode === "ctrl" ? "direct" : "ctrl");
    }, [linkClickMode, onLinkClickModeChange]);

    const handleZoomOut = useCallback(
      () =>
        onZoomChange(
          Math.max(ZOOM_MIN, Math.round((zoom - ZOOM_STEP) * 100) / 100),
        ),
      [zoom, onZoomChange],
    );
    const handleZoomIn = useCallback(
      () =>
        onZoomChange(
          Math.min(ZOOM_MAX, Math.round((zoom + ZOOM_STEP) * 100) / 100),
        ),
      [zoom, onZoomChange],
    );
    const handleZoomReset = useCallback(
      () => onZoomChange(1.0),
      [onZoomChange],
    );

    const handleZoomInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setZoomInputValue(e.target.value),
      [],
    );
    const handleZoomInputKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setZoomInputValue(String(Math.round(zoom * 100)));
          setZoomInputFocused(false);
          (e.target as HTMLInputElement).blur();
        }
      },
      [zoom],
    );

    const commitZoomInput = useCallback(() => {
      const parsed = parseInt(zoomInputValue, 10);
      if (!isNaN(parsed)) {
        const clamped = Math.min(
          ZOOM_MAX * 100,
          Math.max(ZOOM_MIN * 100, parsed),
        );
        onZoomChange(Math.round(clamped) / 100);
        setZoomInputValue(String(Math.round(clamped)));
      } else {
        setZoomInputValue(String(Math.round(zoom * 100)));
      }
      setZoomInputFocused(false);
    }, [zoomInputValue, zoom, onZoomChange]);

    const handleDynamicToggle = useCallback(
      () => onDynamicUpdateChange(!dynamicUpdate),
      [dynamicUpdate, onDynamicUpdateChange],
    );

    const handlePublic = useCallback(async () => {
      setIsPublishModalOpen(true);
    }, []);

    return (
      <>
        <PublishSettingsModal
          open={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
        />

        <div className="editor-header-inner">
          {/* ── LEFT ── */}
          <div className="flex items-center gap-1.5">
            <Link
              to="/create"
              title={isThai ? "กลับไปหน้าสร้าง" : "Back to create"}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft size={14} strokeWidth={1.8} />
              <span>{isThai ? "สร้าง" : "Create"}</span>
            </Link>
            <div className="mx-1 h-4 w-px bg-border" />
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled"
              className="w-32 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors hover:text-foreground focus:placeholder:opacity-0"
            />
            <div className="mx-1 h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              {isSaving && (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>{isThai ? "กำลังบันทึก…" : "Saving…"}</span>
                </>
              )}
              {!isSaving && !isDirty && (
                <>
                  <Save size={12} />
                  <span>{isThai ? "บันทึกแล้ว" : "Saved"}</span>
                </>
              )}
              {!isSaving && isDirty && (
                <button
                  onClick={handleSave}
                  title={isThai ? "บันทึก" : "Save"}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-accent text-muted-foreground"
                >
                  <Save size={12} />
                  <span>{isThai ? "บันทึก?" : "Save?"}</span>
                </button>
              )}
            </div>
            <div className="mx-1.5 h-4 w-px bg-border" />
            <IconBtn
              title={isThai ? "ย้อนกลับ" : "Undo"}
              onClick={handleUndo}
              disabled={!canUndo}
            >
              <div className="flex">
                <p>{isThai ? "ย้อนกลับ" : "Undo"}</p>
                <Undo2 size={15} strokeWidth={1.8} />
              </div>
            </IconBtn>
            <IconBtn
              title={isThai ? "ทำซ้ำ" : "Redo"}
              onClick={handleRedo}
              disabled={!canRedo}
            >
              <div className="flex">
                <Redo2 size={15} strokeWidth={1.8} />
                <p>{isThai ? "ทำซ้ำ" : "Redo"}</p>
              </div>
            </IconBtn>
            <div className="mx-1 h-4 w-px bg-border" />
            <AiWritingAssistant editor={editor} />
          </div>

          {/* ── RIGHT ── */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle compact />
            <LanguageToggle compact />
            <div className="mx-1 h-4 w-px bg-border" />
            {/* ── DYNAMIC UPDATE TOGGLE ── */}
            <button
              onClick={handleDynamicToggle}
              title={
                dynamicUpdate
                  ? isThai
                    ? "โหมดสด: ทูลบาร์ติดตามตำแหน่งเคอร์เซอร์ คลิกเพื่อปิด"
                    : "Live mode: toolbar tracks cursor position. Click to disable."
                  : isThai
                    ? "โหมดคงที่: ทูลบาร์ไม่ติดตามเคอร์เซอร์ คลิกเพื่อเปิด"
                    : "Static mode: toolbar won't track cursor. Click to enable."
              }
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
                dynamicUpdate
                  ? "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
              }`}
            >
              {dynamicUpdate ? (
                <Zap size={12} strokeWidth={1.8} />
              ) : (
                <ZapOff size={12} strokeWidth={1.8} />
              )}
              <span>
                {dynamicUpdate
                  ? isThai
                    ? "สด"
                    : "Live"
                  : isThai
                    ? "คงที่"
                    : "Static"}
              </span>
            </button>

            <div className="mx-1 h-4 w-px bg-border" />

            {/* ── ZOOM CONTROLS ── */}
            <span className="text-xs text-muted-foreground px-1 select-none">
              {isThai ? "ซูม:" : "Zoom:"}
            </span>
            <div className="flex items-center gap-0.5 rounded-md border border-border/60 px-1 py-0.5">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= ZOOM_MIN}
                title={isThai ? "ซูมออก" : "Zoom out"}
                className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ZoomOut size={12} strokeWidth={1.8} />
              </button>

              <button
                onClick={handleZoomReset}
                title={isThai ? "รีเซ็ตซูม (100%)" : "Reset zoom (100%)"}
                className="relative flex items-center justify-center h-5 rounded px-0.5 transition-colors hover:bg-accent group"
                style={{ minWidth: "2.5rem" }}
              >
                {!zoomInputFocused && (
                  <span className="text-xs text-muted-foreground group-hover:text-foreground tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                )}
                <input
                  type="text"
                  value={zoomInputValue}
                  onChange={handleZoomInputChange}
                  onFocus={() => setZoomInputFocused(true)}
                  onBlur={commitZoomInput}
                  onKeyDown={handleZoomInputKeyDown}
                  className={`absolute inset-0 w-full text-center text-xs bg-accent text-foreground outline-none rounded tabular-nums transition-opacity ${
                    zoomInputFocused
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                  aria-label="Zoom percentage"
                />
              </button>

              <button
                onClick={handleZoomIn}
                disabled={zoom >= ZOOM_MAX}
                title={isThai ? "ซูมเข้า" : "Zoom in"}
                className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ZoomIn size={12} strokeWidth={1.8} />
              </button>
            </div>

            <div className="mx-1 h-4 w-px bg-border" />

            <button
              onClick={handleLinkToggle}
              title={
                linkClickMode === "ctrl"
                  ? isThai
                    ? "ลิงก์เปิดด้วย Ctrl+คลิก"
                    : "Links open on Ctrl+Click"
                  : isThai
                    ? "ลิงก์เปิดด้วยคลิก"
                    : "Links open on Click"
              }
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
                linkClickMode === "direct"
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <Link2 size={12} strokeWidth={1.8} />
              <p>{isThai ? "ลิงก์:" : "Link:"}</p>
              {linkClickMode === "direct"
                ? isThai
                  ? "เปิดเมื่อคลิก"
                  : "Open on Click"
                : isThai
                  ? "เปิดเมื่อ Ctrl+คลิก"
                  : "Open on Ctrl+Click"}
            </button>
            <div className="mx-1.5 h-4 w-px bg-border" />
            <AiCriticButton editor={editor} />
            <button
              className="rounded-full bg-editor-highlight px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              onClick={handlePublic}
            >
              {isThai ? "เผยแพร่" : "Publish"}
            </button>
          </div>
        </div>
      </>
    );
  },
);

export default EditorHeader;
