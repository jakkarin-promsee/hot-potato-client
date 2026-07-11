import { useState, useCallback, useRef, useEffect, memo } from "react";
import { Editor } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Link,
  Crop,
  X,
  Check,
  Lock,
  Unlock,
  RotateCcw,
} from "lucide-react";
import { useEditorI18n } from "./editor.i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageAttrs {
  src: string;
  alt: string;
  align: string;
  width?: number | string;
  height?: number | string;
  "data-align"?: string;
}

interface CropRect {
  x: number; // px relative to rendered image
  y: number;
  width: number;
  height: number;
}

type AspectRatio = "free" | "16:9" | "4:3" | "1:1" | "3:4";

const ASPECT_RATIOS: { label: string; value: AspectRatio }[] = [
  { label: "Free", value: "free" },
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
  { label: "1:1", value: "1:1" },
  { label: "3:4", value: "3:4" },
];

const RATIO_MAP: Record<string, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "3:4": 3 / 4,
};

const IMAGE_ALIGNS = [
  { Icon: AlignLeft, align: "left" },
  { Icon: AlignCenter, align: "center" },
  { Icon: AlignRight, align: "right" },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a Cloudinary crop+resize URL — always rebuilds from the clean original */
function buildCropUrl(
  originalSrc: string,
  crop: {
    x: number;
    y: number;
    w: number;
    h: number;
    naturalW: number;
    naturalH: number;
    renderedW: number;
    renderedH: number;
  },
  targetWidthPct: number,
): string {
  const parsed = splitCloudinaryUrl(originalSrc);
  if (!parsed) return originalSrc;

  const { prefix, publicId } = parsed;

  // Scale crop coords from rendered px → original px
  const scaleX = crop.naturalW / crop.renderedW;
  const scaleY = crop.naturalH / crop.renderedH;

  const cx = Math.round(crop.x * scaleX);
  const cy = Math.round(crop.y * scaleY);
  const cw = Math.round(crop.w * scaleX);
  const ch = Math.round(crop.h * scaleY);

  // Target display width as a percentage of the cropped region width
  const displayW = Math.round(cw * (targetWidthPct / 100));

  const cropSeg = `c_crop,h_${ch},w_${cw},x_${cx},y_${cy}`;
  const resizeSeg = `c_scale,w_${displayW}`;

  return prefix + cropSeg + "/" + resizeSeg + publicId;
}

/**
 * Cloudinary URL anatomy:
 *   https://res.cloudinary.com/<cloud>/image/upload/<transforms>/<public_id>.<ext>
 *
 * <transforms> is one or more slash-separated segments, e.g.:
 *   c_crop,h_400,w_600,x_10,y_20/c_scale,w_300
 *
 * The public_id itself may contain slashes (folder paths), so we identify the
 * "last segment that is purely transforms" by scanning from /upload/ forward and
 * stopping at the first segment that contains a dot (the filename) or is clearly
 * not a transform (no underscore).
 */
function splitCloudinaryUrl(src: string): {
  prefix: string; // everything up to and including /upload/
  transformSegments: string[]; // each slash-separated transform chunk
  publicId: string; // /folder/image.jpg (leading slash included)
} | null {
  const uploadIdx = src.indexOf("/upload/");
  if (uploadIdx === -1) return null;

  const prefix = src.slice(0, uploadIdx + 8); // "https://.../upload/"
  const rest = src.slice(uploadIdx + 8); // "c_crop,.../folder/image.jpg"

  // Split on "/" and walk forward collecting transform segments.
  // A segment is a transform if ALL its comma-parts contain "_"
  // (Cloudinary params always look like key_value).
  const parts = rest.split("/");
  const transformSegments: string[] = [];
  let publicIdParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (!part) continue;
    const isTransform =
      part.length > 0 &&
      part.split(",").every((p) => p.includes("_") && !p.includes("."));

    if (isTransform) {
      transformSegments.push(part);
    } else {
      // This and everything after is the public_id
      publicIdParts = parts.slice(i);
      break;
    }
  }

  return {
    prefix,
    transformSegments,
    publicId: "/" + publicIdParts.join("/"),
  };
}

/** Build a resize-only Cloudinary URL (no crop) */
function buildResizeUrl(src: string, widthPx: number): string {
  const uploadSignifier = "/upload/";
  const uploadIdx = src.indexOf(uploadSignifier);

  if (uploadIdx === -1) return src;

  const prefix = src.slice(0, uploadIdx + uploadSignifier.length);
  const rest = src.slice(uploadIdx + uploadSignifier.length);

  const parts = rest.split("/");

  // Cloudinary Public IDs can have slashes, but transforms usually
  // appear immediately after /upload/ and contain underscores.
  // We'll filter out existing scaling transforms.
  const transformSegments: string[] = [];
  let publicIdIndex = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] as string;
    // A transform segment usually contains an underscore (e.g., c_fill, w_100)
    // AND it is not a version string (starts with 'v' followed by digits)
    const isTransform = part.includes("_") && !/^v\d+/.test(part);

    if (isTransform) {
      // Drop existing width/height/scale transforms to avoid conflicts
      const isSizeTransform = part
        .split(",")
        .some(
          (p) =>
            p.startsWith("w_") ||
            p.startsWith("h_") ||
            p.startsWith("c_scale") ||
            p.startsWith("c_limit"),
        );

      if (!isSizeTransform) {
        transformSegments.push(part);
      }
    } else {
      // Once we hit a part without an underscore that isn't a version,
      // we've likely hit the folders/publicId.
      publicIdIndex = i;
      break;
    }
  }

  const publicId = parts.slice(publicIdIndex).join("/");
  const newTransform = `c_scale,w_${widthPx}`;

  // Construct: Prefix + [other transforms] + New Resize + PublicID
  return `${prefix}${transformSegments.length ? transformSegments.join("/") + "/" : ""}${newTransform}/${publicId}`;
}

// ─── Crop Overlay ─────────────────────────────────────────────────────────────

interface CropOverlayProps {
  imgEl: HTMLImageElement;
  aspectRatio: AspectRatio;
  onConfirm: (rect: CropRect) => void;
  onCancel: () => void;
}

const CropOverlay = memo(
  ({ imgEl, aspectRatio, onConfirm, onCancel }: CropOverlayProps) => {
    const { t } = useEditorI18n();
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragMode = useRef<
      "new" | "move" | "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r"
    >("new");
    const dragStart = useRef({ x: 0, y: 0 });
    const rectStart = useRef<CropRect | null>(null);

    const imgRect = imgEl.getBoundingClientRect();

    const clampRect = useCallback(
      (r: CropRect, ar: AspectRatio): CropRect => {
        let { x, y, width, height } = r;
        const W = imgRect.width;
        const H = imgRect.height;

        // Apply aspect ratio
        if (ar !== "free") {
          const ratio = RATIO_MAP[ar]!;
          height = width / ratio;
          if (height > H) {
            height = H;
            width = height * ratio;
          }
        }

        // Clamp to image bounds
        width = Math.max(20, Math.min(width, W));
        height = Math.max(20, Math.min(height, H));
        x = Math.max(0, Math.min(x, W - width));
        y = Math.max(0, Math.min(y, H - height));

        return { x, y, width, height };
      },
      [imgRect],
    );

    const [rect, setRect] = useState<CropRect | null>(() =>
      clampRect(
        { x: 0, y: 0, width: imgRect.width, height: imgRect.height },
        aspectRatio,
      ),
    );

    const containerStyle: React.CSSProperties = {
      position: "fixed",
      left: imgRect.left,
      top: imgRect.top,
      width: imgRect.width,
      height: imgRect.height,
      zIndex: 9999,
      cursor: "crosshair",
      userSelect: "none",
    };

    const onMouseDown = useCallback(
      (e: React.MouseEvent, mode: typeof dragMode.current) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        dragMode.current = mode;
        const containerEl = containerRef.current!;
        const cr = containerEl.getBoundingClientRect();
        dragStart.current = { x: e.clientX - cr.left, y: e.clientY - cr.top };
        rectStart.current = rect ? { ...rect } : null;

        if (mode === "new") {
          const x = e.clientX - cr.left;
          const y = e.clientY - cr.top;
          setRect({ x, y, width: 0, height: 0 });
          rectStart.current = { x, y, width: 0, height: 0 };
        }
      },
      [rect],
    );

    useEffect(() => {
      const onMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const containerEl = containerRef.current!;
        const cr = containerEl.getBoundingClientRect();
        const mx = e.clientX - cr.left;
        const my = e.clientY - cr.top;
        const dx = mx - dragStart.current.x;
        const dy = my - dragStart.current.y;

        setRect(() => {
          const rs = rectStart.current!;
          let next: CropRect;
          const mode = dragMode.current;
          const ar = aspectRatio;
          const ratio = ar !== "free" ? RATIO_MAP[ar]! : null;

          if (mode === "new") {
            next = {
              x: Math.min(dragStart.current.x, mx),
              y: Math.min(dragStart.current.y, my),
              width: Math.abs(mx - dragStart.current.x),
              height: Math.abs(my - dragStart.current.y),
            };
          } else if (mode === "move") {
            next = { ...rs, x: rs.x + dx, y: rs.y + dy };
          } else if (mode === "tl") {
            next = {
              x: rs.x + dx,
              y: rs.y + dy,
              width: rs.width - dx,
              height: rs.height - dy,
            };
          } else if (mode === "tr") {
            next = {
              x: rs.x,
              y: rs.y + dy,
              width: rs.width + dx,
              height: rs.height - dy,
            };
          } else if (mode === "bl") {
            next = {
              x: rs.x + dx,
              y: rs.y,
              width: rs.width - dx,
              height: rs.height + dy,
            };
          } else if (mode === "br") {
            next = {
              x: rs.x,
              y: rs.y,
              width: rs.width + dx,
              height: rs.height + dy,
            };
          } else if (mode === "t") {
            if (ar === "free") {
              next = {
                x: rs.x,
                y: rs.y + dy,
                width: rs.width,
                height: rs.height - dy,
              };
            } else {
              const newH = rs.height - dy;
              next = {
                x: rs.x,
                y: rs.y + dy,
                width: newH * ratio!,
                height: newH,
              };
            }
          } else if (mode === "b") {
            if (ar === "free") {
              next = {
                x: rs.x,
                y: rs.y,
                width: rs.width,
                height: rs.height + dy,
              };
            } else {
              const newH = rs.height + dy;
              next = {
                x: rs.x,
                y: rs.y,
                width: newH * ratio!,
                height: newH,
              };
            }
          } else if (mode === "l") {
            if (ar === "free") {
              next = {
                x: rs.x + dx,
                y: rs.y,
                width: rs.width - dx,
                height: rs.height,
              };
            } else {
              const newW = rs.width - dx;
              next = {
                x: rs.x + dx,
                y: rs.y,
                width: newW,
                height: newW / ratio!,
              };
            }
          } else if (mode === "r") {
            if (ar === "free") {
              next = {
                x: rs.x,
                y: rs.y,
                width: rs.width + dx,
                height: rs.height,
              };
            } else {
              const newW = rs.width + dx;
              next = {
                x: rs.x,
                y: rs.y,
                width: newW,
                height: newW / ratio!,
              };
            }
          } else {
            next = rs;
          }

          return clampRect(next, aspectRatio);
        });
      };

      const onUp = () => {
        isDragging.current = false;
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    }, [clampRect, aspectRatio]);

    const displayRect = rect && rect.width > 5 && rect.height > 5 ? rect : null;

    return (
      <div
        ref={containerRef}
        style={containerStyle}
        onMouseDown={(e) => onMouseDown(e, "new")}
      >
        {/* Dark overlay with hole */}
        <svg
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          width={imgRect.width}
          height={imgRect.height}
        >
          {displayRect ? (
            <>
              <defs>
                <mask id="crop-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={displayRect.x}
                    y={displayRect.y}
                    width={displayRect.width}
                    height={displayRect.height}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.55)"
                mask="url(#crop-mask)"
              />
            </>
          ) : (
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.4)" />
          )}
        </svg>

        {/* Crop rectangle */}
        {displayRect && (
          <div
            style={{
              position: "absolute",
              left: displayRect.x,
              top: displayRect.y,
              width: displayRect.width,
              height: displayRect.height,
              border: "2px solid #0a0a0a",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.92)",
              boxSizing: "border-box",
              cursor: "move",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onMouseDown(e, "move");
            }}
          >
            {/* Rule of thirds grid */}
            <svg
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: 0.4,
              }}
              width="100%"
              height="100%"
            >
              <line
                x1="33.3%"
                y1="0"
                x2="33.3%"
                y2="100%"
                stroke="white"
                strokeWidth="0.5"
              />
              <line
                x1="66.6%"
                y1="0"
                x2="66.6%"
                y2="100%"
                stroke="white"
                strokeWidth="0.5"
              />
              <line
                x1="0"
                y1="33.3%"
                x2="100%"
                y2="33.3%"
                stroke="white"
                strokeWidth="0.5"
              />
              <line
                x1="0"
                y1="66.6%"
                x2="100%"
                y2="66.6%"
                stroke="white"
                strokeWidth="0.5"
              />
            </svg>

            {/* Corner handles */}
            {(["tl", "tr", "bl", "br"] as const).map((pos) => (
              <div
                key={pos}
                style={{
                  position: "absolute",
                  width: 10,
                  height: 10,
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.95)",
                  boxSizing: "border-box",
                  borderRadius: 2,
                  ...(pos.includes("t") ? { top: -5 } : { bottom: -5 }),
                  ...(pos.includes("l") ? { left: -5 } : { right: -5 }),
                  cursor: `${pos}-resize`,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onMouseDown(e, pos);
                }}
              />
            ))}

            {/* Edge handles (midpoints) */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: -4,
                transform: "translateX(-50%)",
                width: 20,
                height: 8,
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.95)",
                boxSizing: "border-box",
                borderRadius: 2,
                cursor: "ns-resize",
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, "t");
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: -4,
                transform: "translateX(-50%)",
                width: 20,
                height: 8,
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.95)",
                boxSizing: "border-box",
                borderRadius: 2,
                cursor: "ns-resize",
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, "b");
              }}
            />
            <div
              style={{
                position: "absolute",
                left: -4,
                top: "50%",
                transform: "translateY(-50%)",
                width: 8,
                height: 20,
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.95)",
                boxSizing: "border-box",
                borderRadius: 2,
                cursor: "ew-resize",
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, "l");
              }}
            />
            <div
              style={{
                position: "absolute",
                right: -4,
                top: "50%",
                transform: "translateY(-50%)",
                width: 8,
                height: 20,
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.95)",
                boxSizing: "border-box",
                borderRadius: 2,
                cursor: "ew-resize",
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, "r");
              }}
            />

            {/* Dimension badge */}
            <div
              style={{
                position: "absolute",
                bottom: -26,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.75)",
                color: "#fff",
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {Math.round(displayRect.width)} × {Math.round(displayRect.height)}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 6,
            pointerEvents: "all",
          }}
        >
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (displayRect) onConfirm(displayRect);
            }}
            disabled={!displayRect}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              background: displayRect ? "#22c55e" : "rgba(255,255,255,0.2)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: displayRect ? "pointer" : "not-allowed",
              opacity: displayRect ? 1 : 0.5,
            }}
          >
            <Check size={13} />
            {t("Apply", "ยืนยัน")}
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              background: "rgba(0,0,0,0.5)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <X size={13} />
            {t("Cancel", "ยกเลิก")}
          </button>
        </div>
      </div>
    );
  },
);

// ─── Shared primitives ────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span
    style={{
      display: "block",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginBottom: 5,
      opacity: 0.5,
    }}
    className="text-muted-foreground"
  >
    {children}
  </span>
);

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2 mb-1.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="flex items-center gap-1">{children}</div>
  </div>
);

const IconBtn = memo(
  ({
    icon: Icon,
    onClick,
    active = false,
    title,
    danger = false,
  }: {
    icon: React.ElementType;
    onClick: () => void;
    active?: boolean;
    title?: string;
    danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        danger
          ? "text-red-500 hover:bg-red-50"
          : active
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/50"
      }`}
    >
      <Icon size={13} strokeWidth={1.8} />
    </button>
  ),
);

// ─── Main ImagePanel ──────────────────────────────────────────────────────────

export const ImagePanel = memo(
  ({ editor, imageAttrs }: { editor: Editor; imageAttrs: ImageAttrs }) => {
    const { t } = useEditorI18n();
    const [isCropping, setIsCropping] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("free");
    const [resizePct, setResizePct] = useState(100);
    const [aspectLocked, setAspectLocked] = useState(true);
    const [linkUrl, setLinkUrl] = useState("");
    const [showLink, setShowLink] = useState(false);

    // Track the "original" src (before any crop) per session
    const originalSrcRef = useRef<string>(imageAttrs.src);

    // Reset crop/resize session state when the panel opens for an image
    useEffect(() => {
      originalSrcRef.current = imageAttrs.src;
      setIsCropping(false);
      setResizePct(100);
    }, []); // remount via key when the selected image node changes

    // ── Find the actual <img> element in the editor DOM ──────────────────────
    const getImgElement = useCallback((): HTMLImageElement | null => {
      if (!editor) return null;
      const editorDom = editor.view.dom as HTMLElement;
      // Find selected image
      const selection = editor.state.selection;
      const pos = selection.from;
      const node = editor.view.nodeDOM(pos);
      if (node instanceof HTMLImageElement) return node;
      if (node instanceof HTMLElement) {
        const img = node.querySelector("img");
        if (img) return img;
      }
      // Fallback: find img with matching src
      return (
        (editorDom.querySelector(
          `img[src="${CSS.escape(imageAttrs.src)}"]`,
        ) as HTMLImageElement) ?? null
      );
    }, [editor, imageAttrs.src]);

    // ── Crop confirm ─────────────────────────────────────────────────────────
    const handleCropConfirm = useCallback(
      (cropRect: CropRect) => {
        const imgEl = getImgElement();
        if (!imgEl) return;

        const newSrc = buildCropUrl(
          originalSrcRef.current,
          {
            x: cropRect.x,
            y: cropRect.y,
            w: cropRect.width,
            h: cropRect.height,
            naturalW: imgEl.naturalWidth,
            naturalH: imgEl.naturalHeight,
            renderedW: imgEl.getBoundingClientRect().width,
            renderedH: imgEl.getBoundingClientRect().height,
          },
          resizePct,
        );

        editor.chain().focus().updateAttributes("image", { src: newSrc }).run();
        setIsCropping(false);
      },
      [editor, getImgElement, resizePct],
    );

    // ── Resize slider ────────────────────────────────────────────────────────
    // Debounce so we don't spam Cloudinary URLs on every tick
    const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleResizeChange = useCallback(
      (pct: number) => {
        setResizePct(pct);

        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);

        resizeTimerRef.current = setTimeout(() => {
          const imgEl = getImgElement();
          // Ensure we have the element and an original source to work with
          if (!imgEl || !originalSrcRef.current) return;

          const targetW = Math.round((imgEl.naturalWidth * pct) / 100);
          const newSrc = buildResizeUrl(originalSrcRef.current, targetW);

          editor
            .chain()
            .focus()
            .updateAttributes("image", { src: newSrc })
            .run();
        }, 300);
      },
      [editor, getImgElement], // originalSrcRef is a ref, so it doesn't need to be here
    );

    // ── Reset crop ────────────────────────────────────────────────────────────
    const handleResetCrop = useCallback(() => {
      editor
        .chain()
        .focus()
        .updateAttributes("image", { src: originalSrcRef.current })
        .run();
      setResizePct(100);
    }, [editor]);

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = useCallback(() => {
      editor.chain().focus().deleteSelection().run();
    }, [editor]);

    const imgEl = getImgElement();
    const currentAlign = imageAttrs["data-align"] ?? imageAttrs.align ?? "left";
    const resizeProgressPct = ((resizePct - 10) / 190) * 100;

    return (
      <>
        {/* Crop overlay — rendered in a portal-like fixed layer */}
        {isCropping && imgEl && (
          <CropOverlay
            imgEl={imgEl}
            aspectRatio={aspectRatio}
            onConfirm={handleCropConfirm}
            onCancel={() => setIsCropping(false)}
          />
        )}

        <div className="flex flex-col gap-4 pl-1">
          {/* ── EDITING ─────────────────────────────────────── */}
          <div>
            <SectionLabel>Editing</SectionLabel>
            {/* Crop — prominent bordered button */}
            <button
              onClick={() => setIsCropping((v) => !v)}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold transition-all mb-1 ${
                isCropping
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/40"
                  : "bg-accent/60 text-foreground ring-1 ring-border hover:bg-accent hover:ring-border/80"
              }`}
            >
              <Crop size={15} strokeWidth={2} />
              {isCropping
                ? t("Cropping — drag handles or move", "กำลังครอป — ลากจุดจับหรือเลื่อนภาพ")
                : t("Crop image", "ครอปรูปภาพ")}
              {!isCropping && (
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                  {t("adjust frame", "ปรับกรอบ")}
                </span>
              )}
            </button>
            <button
              onClick={handleResetCrop}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <RotateCcw size={13} strokeWidth={1.8} />
              {t("Reset to original", "รีเซ็ตเป็นต้นฉบับ")}
            </button>
          </div>

          {/* ── CROP RATIO PRESETS (shown when cropping) ────── */}
          {isCropping && (
            <div>
              <SectionLabel>{t("Aspect ratio", "อัตราส่วน")}</SectionLabel>
              <div className="flex flex-wrap gap-1">
                {ASPECT_RATIOS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setAspectRatio(value)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors border ${
                      aspectRatio === value
                        ? "bg-accent text-foreground border-border"
                        : "text-muted-foreground border-border/50 hover:bg-accent/50"
                    }`}
                  >
                    {label === "Free" ? t("Free", "อิสระ") : label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <hr className="border-border/50 -mx-1" />

          {/* ── RESIZE ──────────────────────────────────────── */}
          <div>
            <SectionLabel>{t("Resize", "ปรับขนาด")}</SectionLabel>
            {/* Percentage badge */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {t("Scale", "สเกล")}
              </span>
              <span
                className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md"
                style={{
                  background: "hsl(var(--primary) / 0.12)",
                  color: "hsl(var(--primary))",
                }}
              >
                {resizePct}%
              </span>
            </div>
            {/* Always-visible custom slider visuals + native input overlay */}
            <div className="relative h-6">
              <div
                className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full border border-border bg-muted"
                aria-hidden="true"
              />
              <div
                className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
                style={{ width: `${resizeProgressPct}%` }}
                aria-hidden="true"
              />
              <div
                className="absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-[0_0_0_1px_hsl(var(--primary)),0_0_0_2px_hsl(var(--foreground)/0.22)]"
                style={{ left: `${resizeProgressPct}%` }}
                aria-hidden="true"
              />
              <input
                type="range"
                min={10}
                max={200}
                step={1}
                value={resizePct}
                onChange={(e) => handleResizeChange(Number(e.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label={t("Resize image scale", "ปรับสเกลรูปภาพ")}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1 px-0.5">
              <span>10%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>

          {/* ── ALIGNMENT ───────────────────────────────────── */}
          <div>
            <SectionLabel>{t("Alignment", "การจัดวาง")}</SectionLabel>
            <Row label={t("Position", "ตำแหน่ง")}>
              <div className="flex gap-0.5">
                {IMAGE_ALIGNS.map(({ Icon, align }) => (
                  <IconBtn
                    key={align}
                    icon={Icon}
                    title={align}
                    active={currentAlign === align}
                    onClick={() =>
                      editor
                        .chain()
                        .focus()
                        .updateAttributes("image", { "data-align": align })
                        .run()
                    }
                  />
                ))}
              </div>
            </Row>
          </div>

          {/* ── SIZE (manual) ───────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <SectionLabel>{t("Size (px)", "ขนาด (px)")}</SectionLabel>
              <button
                onClick={() => setAspectLocked((v) => !v)}
                title={
                  aspectLocked
                    ? t("Unlock aspect ratio", "ปลดล็อกอัตราส่วน")
                    : t("Lock aspect ratio", "ล็อกอัตราส่วน")
                }
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors border ${
                  aspectLocked
                    ? "border-primary/40 bg-primary/8 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent/50"
                }`}
                style={{
                  background: aspectLocked
                    ? "hsl(var(--primary) / 0.08)"
                    : undefined,
                }}
              >
                {aspectLocked ? <Lock size={9} /> : <Unlock size={9} />}
                {aspectLocked ? t("Locked", "ล็อกอยู่") : t("Unlocked", "ปลดล็อก")}
              </button>
            </div>
            {/* Width */}
            <div className="mb-1.5">
              <label className="text-[10px] text-muted-foreground/60 mb-1 block">
                {t("Width", "ความกว้าง")}
              </label>
              <input
                type="number"
                placeholder={t("e.g. 600", "เช่น 600")}
                defaultValue={
                  typeof imageAttrs.width === "number"
                    ? imageAttrs.width
                    : undefined
                }
                onBlur={(e) => {
                  const w = parseInt(e.target.value);
                  if (!isNaN(w) && w > 0) {
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("image", {
                        width: w,
                        ...(aspectLocked &&
                        imageAttrs.width &&
                        imageAttrs.height
                          ? {
                              height: Math.round(
                                (w / Number(imageAttrs.width)) *
                                  Number(imageAttrs.height),
                              ),
                            }
                          : {}),
                      })
                      .run();
                  }
                }}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            {/* Height */}
            <div>
              <label className="text-[10px] text-muted-foreground/60 mb-1 block">
                {t("Height", "ความสูง")}
              </label>
              <input
                type="number"
                placeholder={t("e.g. 400", "เช่น 400")}
                defaultValue={
                  typeof imageAttrs.height === "number"
                    ? imageAttrs.height
                    : undefined
                }
                onBlur={(e) => {
                  const h = parseInt(e.target.value);
                  if (!isNaN(h) && h > 0) {
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("image", {
                        height: h,
                        ...(aspectLocked &&
                        imageAttrs.width &&
                        imageAttrs.height
                          ? {
                              width: Math.round(
                                (h / Number(imageAttrs.height)) *
                                  Number(imageAttrs.width),
                              ),
                            }
                          : {}),
                      })
                      .run();
                  }
                }}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* ── ALT TEXT ────────────────────────────────────── */}
          <div>
            <SectionLabel>{t("Alt text", "ข้อความกำกับภาพ")}</SectionLabel>
            <textarea
              defaultValue={imageAttrs.alt}
              placeholder={t("Describe the image…", "อธิบายรูปภาพ…")}
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40 leading-relaxed"
              onChange={(e) =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes("image", { alt: e.target.value })
                  .run()
              }
            />
          </div>

          {/* ── LINK ────────────────────────────────────────── */}
          <div>
            <SectionLabel>{t("Link", "ลิงก์")}</SectionLabel>
            <button
              onClick={() => setShowLink((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <Link size={14} strokeWidth={1.8} />
              {showLink ? t("Remove link", "ลบลิงก์") : t("Add link", "เพิ่มลิงก์")}
            </button>
            {showLink && (
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
                onBlur={() => {
                  if (linkUrl) {
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("image", { "data-href": linkUrl })
                      .run();
                  }
                }}
              />
            )}
          </div>

          <hr className="border-border/50 -mx-1" />

          {/* ── DELETE ──────────────────────────────────────── */}
          <button
            onClick={handleDelete}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 size={13} strokeWidth={1.8} />
            {t("Remove image", "ลบรูปภาพ")}
          </button>
        </div>
      </>
    );
  },
);

export default ImagePanel;
