import { useEditor, EditorContent } from "@tiptap/react";
import "@/indexTiptap.css";

import EditorHeader from "./EditorHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasContext } from "@/contexts/CanvasContext";

import EditorLeftSidebar from "./EditorLeftSidebar";
import EditorRightSidebar from "./EditorRightSidebar";
import CanvasLeftSidebar from "./canvas/CanvasLeftSidebar";
import CanvasRightSidebar from "./canvas/CanvasRightSidebar";
import { useCanvasStore } from "@/stores/canvas.store";
import { useUploadStore } from "@/stores/cloudinary.store";
import {
  getCachedSecureUrlForPaste,
  hashImageFileContent,
  rememberPastedImageUrl,
} from "@/lib/clipboardPasteImageCache";
import { createEditorExtensions } from "./config/editorExtensions";
import AiDraftLauncher from "./ai/AiDraftLauncher";
import { useEditorI18n } from "./editor.i18n";
import { isSaveShortcut, saveLessonNow } from "./saveLesson";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1; // finer step for ctrl+scroll

const TipTapEditor = () => {
  const { isThai } = useEditorI18n();
  const [dynamicUpdate, setDynamicUpdate] = useState(true);
  const [linkClickMode, setLinkClickMode] = useState<"ctrl" | "direct">("ctrl");
  const [sidebarCategory, setSidebarCategory] = useState<
    "ai" | "text" | "media" | "formular" | "special"
  >("text");
  const [zoom, setZoom] = useState(1.0);
  const mainRef = useRef<HTMLDivElement>(null);
  const saveNowRef = useRef<() => void>(() => {
    void saveLessonNow();
  });

  const { tiptapJson, setTiptapJson } = useCanvasStore();

  const conflict = useCanvasStore((s) => s.conflict);
  const forceSave = useCanvasStore((s) => s.forceSave);
  const loadContent = useCanvasStore((s) => s.loadContent);
  const contentId = useCanvasStore((s) => s.contentId);

  const editor = useEditor({
    extensions: createEditorExtensions(true),
    editable: true,

    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              const { schema } = view.state;
              const node = schema.nodes.image?.create({ src });
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (pos && node) {
                const tr = view.state.tr.insert(pos.pos, node);
                view.dispatch(tr);
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items?.length) return false;

        let imageFile: File | null = null;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item || item.kind !== "file") continue;
          if (!item.type.startsWith("image/")) continue;
          const file = item.getAsFile();
          if (file) {
            imageFile = file;
            break;
          }
        }

        if (!imageFile) return false;

        const fileToUpload = imageFile;
        event.preventDefault();
        void (async () => {
          let secureUrl: string | undefined;

          try {
            const hash = await hashImageFileContent(fileToUpload);
            const cached = getCachedSecureUrlForPaste(hash);
            if (cached) {
              secureUrl = cached;
            } else {
              const saved = await useUploadStore
                .getState()
                .upload(fileToUpload);
              if (!saved) return;
              secureUrl = saved.secure_url;
              rememberPastedImageUrl(hash, secureUrl);
            }
          } catch {
            const saved = await useUploadStore.getState().upload(fileToUpload);
            if (!saved) return;
            secureUrl = saved.secure_url;
          }

          if (!secureUrl || !view.dom.isConnected) return;

          const { schema } = view.state;
          const imageType = schema.nodes.image;
          if (!imageType) return;

          const node = imageType.create({ src: secureUrl });
          const tr = view.state.tr.replaceSelectionWith(node).scrollIntoView();
          view.dispatch(tr);
        })();

        return true;
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        const anchor = target.closest("a");
        if (!anchor) return false;

        event.preventDefault();
        event.stopPropagation();

        if (linkClickMode === "direct" || event.ctrlKey || event.metaKey) {
          const href = anchor.getAttribute("href");
          if (href) window.open(href, "_blank");
        }

        return true;
      },
      handleKeyDown(_view, event) {
        if (!isSaveShortcut(event)) return false;
        event.preventDefault();
        saveNowRef.current();
        return true;
      },
    },
    content: "",
    onUpdate: ({ editor }) => {
      setTiptapJson(JSON.stringify(editor.getJSON()));
    },
  });

  // Set content only when the editor is empty or when contentId changes
  useEffect(() => {
    if (!editor || !tiptapJson || tiptapJson === "{}") return;

    // Check if the current editor content is already the same as tiptapJson
    // to avoid unnecessary re-renders that reset the cursor
    const currentJson = JSON.stringify(editor.getJSON());

    if (currentJson !== tiptapJson) {
      editor.commands.setContent(JSON.parse(tiptapJson));
    }
  }, [editor, tiptapJson]);

  useEffect(() => {
    saveNowRef.current = () => {
      void saveLessonNow(editor);
    };
  }, [editor]);

  // Ctrl+S / Cmd+S — window capture catches header/sidebar focus too
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSaveShortcut(e)) return;
      e.preventDefault();
      e.stopPropagation();
      saveNowRef.current();
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  // ── Focus at the end of editor ──────────────────────────────────────────────
  // use at main div, if users click outside editor
  // but still be in the main edge, the cursor will move to the end of editor
  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      if (!editor || editor.isFocused) return;

      // Don't steal focus if the click was inside a custom block (NodeView)
      const target = e.target as HTMLElement;
      if (target.closest("[data-node-view-wrapper]")) return;
      // Modal overlays (e.g. AiDraftDialog) must keep focus on their inputs.
      if (target.closest("[data-editor-modal]")) return;

      editor.commands.focus("end");
    },
    [editor],
  );

  // ── Ctrl+Scroll zoom ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const next = Math.round((prev + delta) * 100) / 100;
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      });
    };

    // passive: false so we can preventDefault (blocks browser native zoom)
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Ctrl +/- keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((prev) =>
          Math.min(ZOOM_MAX, Math.round((prev + 0.25) * 100) / 100),
        );
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((prev) =>
          Math.max(ZOOM_MIN, Math.round((prev - 0.25) * 100) / 100),
        );
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1.0);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Get <Canvas> for toolbars
  const { canvas, setCanvasSync } = useCanvasContext();

  // Quit canvas when load
  // (The cavas loding method making canvas didn't null, overide the sidebar)
  useEffect(() => {
    setTimeout(() => {
      // console.log("t");
      setCanvasSync(null);
    }, 10);
  }, []);

  //───────────────────────────────────────────────────────────────────────────
  return (
    <>
      {conflict && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs">
          <span>
            {isThai ? "⚠️ มีเวอร์ชันใหม่กว่าอยู่แล้ว!" : "⚠️ A newer version exists!"}
          </span>

          {/* Option 1 — load latest, discard local changes */}
          <button
            onClick={() => {
              loadContent(contentId!); // reloads fresh from DB, clears conflict
            }}
            className="px-2 py-0.5 rounded bg-yellow-200 hover:bg-yellow-300 font-medium transition"
          >
            {isThai ? "โหลดเวอร์ชันล่าสุด" : "Load latest"}
          </button>

          {/* Option 2 — override server with local version */}
          <button
            onClick={forceSave}
            className="px-2 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium transition"
          >
            {isThai ? "เขียนทับด้วยของฉัน" : "Override with mine"}
          </button>
        </div>
      )}

      <div className="editor-layout">
        {/* ── TOP HEADER ── */}
        <header
          className="editor-header"
          // To get back focus to editor content
          // onMouseDown={(e) => {
          //   editor.chain().focus();
          //   console.log("header mouse down");
          // }} // Remove focus to UI
          // onMouseUp={(e) => editor.chain().focus()} // Get forcus back
        >
          <EditorHeader
            editor={editor}
            dynamicUpdate={dynamicUpdate}
            onDynamicUpdateChange={setDynamicUpdate}
            linkClickMode={linkClickMode}
            onLinkClickModeChange={setLinkClickMode}
            zoom={zoom}
            onZoomChange={setZoom}
          />
        </header>

        {/* ── LEFT SIDEBAR ── */}
        <aside
          className="editor-sidebar-left flex"
          // To get back focus to editor content
          // onMouseDown={(e) => {
          //   editor.chain().focus();
          //   console.log("left mouse down");
          // }} // Remove focus to UI
          // onMouseUp={(e) => editor.chain().focus()} // Get forcus back
        >
          {/* Tiptap original Editor */}
          {!canvas && editor && (
            <EditorLeftSidebar
              editor={editor}
              dynamicUpdate={dynamicUpdate}
              activeCategory={sidebarCategory}
              onCategoryChange={setSidebarCategory}
            />
          )}

          {/* Fabric Editor (override) */}
          {canvas && <CanvasLeftSidebar />}
        </aside>

        {/* ── CENTER EDITOR ── */}
        <main ref={mainRef} className="editor-main" onClick={handleEditorClick}>
          {/* Page Range (px <-> editor <-> px) */}
          {/* CSS `zoom` scales layout height along with the visuals, so the
              scroll extent of .editor-main always matches what's on screen
              (transform: scale only scaled the pixels, not the layout). */}
          <div
            className="w-fit mx-auto px-6 editor-card shadow-sm"
            style={{ zoom }}
          >
            {/* Editor (default 400px) */}
            <div
              className="tiptap-editor tiptap-editor--editor mx-auto pt-16 pb-40"
              style={{ width: "400px" }}
            >
              {/* Empty-lesson AI CTA (renders only while the doc is empty) */}
              <AiDraftLauncher editor={editor} variant="cta" />
              <EditorContent editor={editor} />
            </div>
          </div>
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside
          className="editor-sidebar-right"
          // To get back focus to editor content
          // onMouseDown={(e) => {
          //   editor.chain().focus();
          //   console.log("right mouse down");
          // }} // Remove focus to UI
          // onMouseUp={(e) => editor.chain().focus()} // Get forcus back
        >
          {/* Tiptap original Editor */}
          {!canvas && (
            <EditorRightSidebar editor={editor} dynamicUpdate={dynamicUpdate} />
          )}

          {/* Tiptap original Editor */}
          {canvas && <CanvasRightSidebar />}
        </aside>
      </div>
    </>
  );
};

export default TipTapEditor;
