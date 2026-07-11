import { useState, useCallback, useRef, useEffect, memo } from "react";
import {
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  Trash2,
  Crop,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { FabricImage, filters } from "fabric";

// ─── Types ────────────────────────────────────────────────────────────────────

type AspectRatio = "free" | "16:9" | "4:3" | "1:1" | "3:4";
type FilterPreset =
  | "none"
  | "grayscale"
  | "sepia"
  | "invert"
  | "blur"
  | "sharpen"
  | "vintage";

const RATIO_MAP: Record<string, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "3:4": 3 / 4,
};

const ASPECT_RATIOS: { label: string; value: AspectRatio }[] = [
  { label: "Free", value: "free" },
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
  { label: "1:1", value: "1:1" },
  { label: "3:4", value: "3:4" },
];

const FILTER_PRESETS: { label: string; value: FilterPreset }[] = [
  { label: "Original", value: "none" },
  { label: "B&W", value: "grayscale" },
  { label: "Sepia", value: "sepia" },
  { label: "Invert", value: "invert" },
  { label: "Blur", value: "blur" },
  { label: "Sharpen", value: "sharpen" },
  { label: "Vintage", value: "vintage" },
];

// CSS filter equivalent for thumbnail previews
const THUMB_FILTERS: Record<FilterPreset, string> = {
  none: "none",
  grayscale: "grayscale(1)",
  sepia: "sepia(0.9)",
  invert: "invert(1)",
  blur: "blur(2px)",
  sharpen: "contrast(1.4) brightness(1.05)",
  vintage: "sepia(0.4) contrast(1.1) brightness(0.9) saturate(0.8)",
};

// ─── Primitives ───────────────────────────────────────────────────────────────

const Section = memo(
  ({
    title,
    children,
    defaultOpen = true,
  }: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
  }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className="mb-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          {title}
          <ChevronDown
            size={10}
            className={`transition-transform ${open ? "" : "-rotate-90"}`}
          />
        </button>
        {open && <div className="pb-3">{children}</div>}
      </div>
    );
  },
);

const Row = memo(
  ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-2 mb-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  ),
);

const SliderRow = memo(
  ({
    label,
    value,
    min,
    max,
    display,
    onChange,
    onCommit,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    display: string;
    onChange: (v: number) => void;
    onCommit?: () => void;
  }) => (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className="text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded"
          style={{
            background: "hsl(var(--primary)/0.1)",
            color: "hsl(var(--primary))",
          }}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        className="w-full accent-primary h-1 cursor-pointer"
      />
    </div>
  ),
);

const FilterThumb = memo(
  ({
    src,
    filter,
    label,
    active,
    onClick,
  }: {
    src: string;
    filter: FilterPreset;
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg overflow-hidden transition-all ${
        active
          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
          : "ring-1 ring-border hover:ring-primary/50"
      }`}
    >
      <div className="w-full aspect-square overflow-hidden bg-accent/30">
        <img
          src={src}
          alt={label}
          className="w-full h-full object-cover"
          style={{ filter: THUMB_FILTERS[filter] }}
          draggable={false}
        />
      </div>
      <span
        className={`text-[9px] pb-1 font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </button>
  ),
);

// ─── Crop Overlay ─────────────────────────────────────────────────────────────
// Fixed overlay drawn on top of the Fabric canvas for interactive crop selection.

interface CropOverlayProps {
  canvasEl: HTMLCanvasElement;
  obj: FabricImage;
  aspectRatio: AspectRatio;
  onConfirm: (cr: { x: number; y: number; w: number; h: number }) => void;
  onCancel: () => void;
}

const CropOverlay = memo(
  ({ canvasEl, obj, aspectRatio, onConfirm, onCancel }: CropOverlayProps) => {
    const isDragging = useRef(false);
    const dragMode = useRef<"new" | "move" | "tl" | "tr" | "bl" | "br">("new");
    const dragStart = useRef({ x: 0, y: 0 });
    const rectStart = useRef<{
      x: number;
      y: number;
      w: number;
      h: number;
    } | null>(null);
    const [rect, setRect] = useState<{
      x: number;
      y: number;
      w: number;
      h: number;
    } | null>(null);

    // Image bounds in screen space
    const canvasDomRect = canvasEl.getBoundingClientRect();
    const objBounds = obj.getBoundingRect();
    const imgLeft = canvasDomRect.left + objBounds.left;
    const imgTop = canvasDomRect.top + objBounds.top;
    const imgW = objBounds.width;
    const imgH = objBounds.height;

    const clamp = useCallback(
      (r: { x: number; y: number; w: number; h: number }) => {
        let { x, y, w, h } = r;
        if (aspectRatio !== "free" && RATIO_MAP[aspectRatio]) {
          const ratio = RATIO_MAP[aspectRatio]!;
          h = w / ratio;
          if (h > imgH) {
            h = imgH;
            w = h * ratio;
          }
        }
        w = Math.max(20, Math.min(w, imgW));
        h = Math.max(20, Math.min(h, imgH));
        x = Math.max(0, Math.min(x, imgW - w));
        y = Math.max(0, Math.min(y, imgH - h));
        return { x, y, w, h };
      },
      [aspectRatio, imgW, imgH],
    );

    const startDrag = useCallback(
      (e: React.MouseEvent, mode: typeof dragMode.current = "new") => {
        e.preventDefault();
        e.stopPropagation();
        const cx = e.clientX - imgLeft;
        const cy = e.clientY - imgTop;
        isDragging.current = true;
        dragMode.current = mode;
        dragStart.current = { x: cx, y: cy };
        rectStart.current = rect ? { ...rect } : null;
        if (mode === "new") {
          setRect({ x: cx, y: cy, w: 0, h: 0 });
          rectStart.current = { x: cx, y: cy, w: 0, h: 0 };
        }
      },
      [rect, imgLeft, imgTop],
    );

    useEffect(() => {
      const onMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const mx = e.clientX - imgLeft;
        const my = e.clientY - imgTop;
        const dx = mx - dragStart.current.x;
        const dy = my - dragStart.current.y;
        const rs = rectStart.current!;
        let next: { x: number; y: number; w: number; h: number };
        switch (dragMode.current) {
          case "new":
            next = {
              x: Math.min(dragStart.current.x, mx),
              y: Math.min(dragStart.current.y, my),
              w: Math.abs(mx - dragStart.current.x),
              h: Math.abs(my - dragStart.current.y),
            };
            break;
          case "move":
            next = { ...rs, x: rs.x + dx, y: rs.y + dy };
            break;
          case "tl":
            next = { x: rs.x + dx, y: rs.y + dy, w: rs.w - dx, h: rs.h - dy };
            break;
          case "tr":
            next = { x: rs.x, y: rs.y + dy, w: rs.w + dx, h: rs.h - dy };
            break;
          case "bl":
            next = { x: rs.x + dx, y: rs.y, w: rs.w - dx, h: rs.h + dy };
            break;
          default:
            next = { x: rs.x, y: rs.y, w: rs.w + dx, h: rs.h + dy };
            break;
        }
        setRect(clamp(next));
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
    }, [clamp, imgLeft, imgTop]);

    // Convert overlay px → Fabric image natural pixel coordinates
    const handleConfirm = () => {
      if (!dr) return;
      const el = obj.getElement() as HTMLImageElement;
      const rxScale = el.naturalWidth / imgW;
      const ryScale = el.naturalHeight / imgH;
      onConfirm({
        x: Math.round(dr.x * rxScale),
        y: Math.round(dr.y * ryScale),
        w: Math.round(dr.w * rxScale),
        h: Math.round(dr.h * ryScale),
      });
    };

    const dr = rect && rect.w > 8 && rect.h > 8 ? rect : null;

    return (
      <div
        style={{
          position: "fixed",
          left: imgLeft,
          top: imgTop,
          width: imgW,
          height: imgH,
          zIndex: 9999,
          cursor: "crosshair",
          userSelect: "none",
        }}
        onMouseDown={(e) => startDrag(e, "new")}
      >
        {/* Dark mask with crop hole */}
        <svg
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          width={imgW}
          height={imgH}
        >
          {dr ? (
            <>
              <defs>
                <mask id="cvs-crop-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={dr.x}
                    y={dr.y}
                    width={dr.w}
                    height={dr.h}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.55)"
                mask="url(#cvs-crop-mask)"
              />
            </>
          ) : (
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.35)" />
          )}
        </svg>

        {/* Selection box */}
        {dr && (
          <div
            style={{
              position: "absolute",
              left: dr.x,
              top: dr.y,
              width: dr.w,
              height: dr.h,
              border: "1.5px solid #fff",
              boxSizing: "border-box",
              cursor: "move",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              startDrag(e, "move");
            }}
          >
            {/* Rule of thirds grid */}
            <svg
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: 0.35,
              }}
              width="100%"
              height="100%"
            >
              {["33.3%", "66.6%"].map((p) => (
                <g key={p}>
                  <line
                    x1={p}
                    y1="0"
                    x2={p}
                    y2="100%"
                    stroke="white"
                    strokeWidth="0.5"
                  />
                  <line
                    x1="0"
                    y1={p}
                    x2="100%"
                    y2={p}
                    stroke="white"
                    strokeWidth="0.5"
                  />
                </g>
              ))}
            </svg>
            {/* Corner handles */}
            {(["tl", "tr", "bl", "br"] as const).map((pos) => (
              <div
                key={pos}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  startDrag(e, pos);
                }}
                style={{
                  position: "absolute",
                  width: 10,
                  height: 10,
                  background: "#fff",
                  borderRadius: 2,
                  ...(pos.includes("t") ? { top: -5 } : { bottom: -5 }),
                  ...(pos.includes("l") ? { left: -5 } : { right: -5 }),
                  cursor: `${pos}-resize`,
                }}
              />
            ))}
            {/* Size badge */}
            <div
              style={{
                position: "absolute",
                bottom: -26,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 4,
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {Math.round(dr.w)} × {Math.round(dr.h)}
            </div>
          </div>
        )}

        {/* Confirm / cancel */}
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
              handleConfirm();
            }}
            disabled={!dr}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              background: dr ? "#22c55e" : "rgba(255,255,255,0.2)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: dr ? "pointer" : "not-allowed",
              opacity: dr ? 1 : 0.5,
            }}
          >
            <Check size={12} /> Apply
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
            <X size={12} /> Cancel
          </button>
        </div>
      </div>
    );
  },
);

// ─── Main export ──────────────────────────────────────────────────────────────

export const CanvasImagePanel = memo(
  ({
    obj,
    canvas,
    saveStateRef,
    forceUpdate,
    tick,
  }: {
    obj: FabricImage;
    canvas: any;
    saveStateRef: React.RefObject<(() => void) | null>;
    forceUpdate: () => void;
    tick: number;
  }) => {
    const [isCropping, setIsCropping] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("free");
    const [activeFilter, setActiveFilter] = useState<FilterPreset>("none");
    const [brightness, setBrightness] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [scalePct, setScalePct] = useState(100);
    const baseScaleRef = useRef({ x: obj.scaleX ?? 1, y: obj.scaleY ?? 1 });
    const scaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset state when a different image is selected
    useEffect(() => {
      setIsCropping(false);
      setActiveFilter("none");
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setScalePct(100);
      baseScaleRef.current = { x: obj.scaleX ?? 1, y: obj.scaleY ?? 1 };
      return () => {
        if (scaleTimerRef.current) clearTimeout(scaleTimerRef.current);
      };
    }, [obj]);

    // ── Canvas element ──────────────────────────────────────────────────────────
    const canvasEl: HTMLCanvasElement | null =
      canvas?.lowerCanvasEl ?? canvas?.getElement?.() ?? null;

    // ── Filter helpers ──────────────────────────────────────────────────────────

    function buildAdjustFilters(b: number, c: number, s: number) {
      const fs: any[] = [];
      if (b !== 0) fs.push(new filters.Brightness({ brightness: b / 100 }));
      if (c !== 0) fs.push(new filters.Contrast({ contrast: c / 100 }));
      if (s !== 0) fs.push(new filters.Saturation({ saturation: s / 100 }));
      return fs;
    }

    const applyFilterPreset = useCallback(
      (preset: FilterPreset) => {
        setActiveFilter(preset);
        const adj = buildAdjustFilters(brightness, contrast, saturation);
        switch (preset) {
          case "none":
            obj.filters = [...adj];
            break;
          case "grayscale":
            obj.filters = [new filters.Grayscale(), ...adj];
            break;
          case "sepia":
            obj.filters = [new filters.Sepia(), ...adj];
            break;
          case "invert":
            obj.filters = [new filters.Invert(), ...adj];
            break;
          case "blur":
            obj.filters = [new filters.Blur({ blur: 0.1 }), ...adj];
            break;
          case "sharpen":
            obj.filters = [
              new filters.Contrast({ contrast: 0.2 }),
              new filters.Brightness({ brightness: 0.05 }),
              ...adj,
            ];
            break;
          case "vintage":
            obj.filters = [
              new filters.Sepia(),
              new filters.Contrast({ contrast: 0.1 }),
              new filters.Brightness({ brightness: -0.05 }),
              new filters.Saturation({ saturation: -0.3 }),
              ...adj,
            ];
            break;
        }
        obj.applyFilters();
        canvas?.renderAll();
        saveStateRef.current?.();
        forceUpdate();
      },
      [
        obj,
        canvas,
        saveStateRef,
        forceUpdate,
        brightness,
        contrast,
        saturation,
      ],
    );

    const applyAdjustments = useCallback(
      (b: number, c: number, s: number) => {
        // Strip out old adjustment filters (keep preset ones)
        const preset = (obj.filters ?? []).filter(
          (f) =>
            !(f instanceof filters.Brightness) &&
            !(f instanceof filters.Contrast) &&
            !(f instanceof filters.Saturation),
        );
        obj.filters = [...preset, ...buildAdjustFilters(b, c, s)];
        obj.applyFilters();
        canvas?.renderAll();
      },
      [obj, canvas],
    );

    // ── Crop ────────────────────────────────────────────────────────────────────

    const handleCropConfirm = useCallback(
      (cr: { x: number; y: number; w: number; h: number }) => {
        obj.set({ cropX: cr.x, cropY: cr.y, width: cr.w, height: cr.h });
        canvas?.renderAll();
        saveStateRef.current?.();
        setIsCropping(false);
        forceUpdate();
      },
      [obj, canvas, saveStateRef, forceUpdate],
    );

    const handleResetCrop = useCallback(() => {
      const el = obj.getElement() as HTMLImageElement;
      obj.set({
        cropX: 0,
        cropY: 0,
        width: el.naturalWidth,
        height: el.naturalHeight,
      });
      canvas?.renderAll();
      saveStateRef.current?.();
      forceUpdate();
    }, [obj, canvas, saveStateRef, forceUpdate]);

    // ── Transform ───────────────────────────────────────────────────────────────

    const flipH = useCallback(() => {
      obj.set({ flipX: !obj.flipX });
      canvas?.renderAll();
      saveStateRef.current?.();
      forceUpdate();
    }, [obj, canvas, saveStateRef, forceUpdate]);

    const flipV = useCallback(() => {
      obj.set({ flipY: !obj.flipY });
      canvas?.renderAll();
      saveStateRef.current?.();
      forceUpdate();
    }, [obj, canvas, saveStateRef, forceUpdate]);

    const handleScaleChange = useCallback(
      (pct: number) => {
        setScalePct(pct);
        if (scaleTimerRef.current) clearTimeout(scaleTimerRef.current);
        scaleTimerRef.current = setTimeout(() => {
          const f = pct / 100;
          obj.set({
            scaleX: baseScaleRef.current.x * f,
            scaleY: baseScaleRef.current.y * f,
          });
          canvas?.renderAll();
        }, 20);
      },
      [obj, canvas],
    );

    const handleScaleCommit = useCallback(() => {
      saveStateRef.current?.();
      forceUpdate();
      baseScaleRef.current = { x: obj.scaleX ?? 1, y: obj.scaleY ?? 1 };
      setScalePct(100);
    }, [obj, saveStateRef, forceUpdate]);

    // ── Delete ──────────────────────────────────────────────────────────────────

    const handleDelete = useCallback(() => {
      if (!canvas) return;
      canvas.remove(obj);
      canvas.discardActiveObject();
      saveStateRef.current?.();
      canvas.renderAll();
    }, [obj, canvas, saveStateRef]);

    const imgSrc = (obj.getElement() as HTMLImageElement)?.src ?? "";

    return (
      <>
        {isCropping && canvasEl && (
          <CropOverlay
            canvasEl={canvasEl}
            obj={obj}
            aspectRatio={aspectRatio}
            onConfirm={handleCropConfirm}
            onCancel={() => setIsCropping(false)}
          />
        )}

        <div className="flex flex-col">
          {/* ── CROP ── */}
          <Section title="Crop">
            <button
              onClick={() => setIsCropping((v) => !v)}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold transition-all mb-1.5 ${
                isCropping
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/40"
                  : "bg-accent/60 text-foreground ring-1 ring-border hover:bg-accent"
              }`}
            >
              <Crop size={14} strokeWidth={2} />
              {isCropping ? "Cropping — draw on image" : "Crop image"}
              {!isCropping && (
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                  drag to select
                </span>
              )}
            </button>

            {isCropping && (
              <div className="flex flex-wrap gap-1 mb-2">
                {ASPECT_RATIOS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setAspectRatio(value)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                      aspectRatio === value
                        ? "bg-accent text-foreground border-border"
                        : "text-muted-foreground border-border/50 hover:bg-accent/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleResetCrop}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <RotateCcw size={12} strokeWidth={1.8} />
              Reset crop
            </button>
          </Section>

          <div className="border-t border-border/40 my-0.5" />

          {/* ── TRANSFORM ── */}
          <Section title="Transform">
            <Row label="Flip">
              <button
                onClick={flipH}
                title="Flip horizontal"
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  obj.flipX
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent/50"
                }`}
              >
                <FlipHorizontal size={12} strokeWidth={1.8} /> H
              </button>
              <button
                onClick={flipV}
                title="Flip vertical"
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  obj.flipY
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent/50"
                }`}
              >
                <FlipVertical size={12} strokeWidth={1.8} /> V
              </button>
            </Row>

            <SliderRow
              label="Scale"
              value={scalePct}
              min={10}
              max={200}
              display={`${scalePct}%`}
              onChange={handleScaleChange}
              onCommit={handleScaleCommit}
            />
          </Section>

          <div className="border-t border-border/40 my-0.5" />

          {/* ── FILTERS ── */}
          <Section title="Filters">
            {imgSrc && (
              <div className="grid grid-cols-4 gap-1">
                {FILTER_PRESETS.map(({ label, value }) => (
                  <FilterThumb
                    key={value}
                    src={imgSrc}
                    filter={value}
                    label={label}
                    active={activeFilter === value}
                    onClick={() => applyFilterPreset(value)}
                  />
                ))}
              </div>
            )}
          </Section>

          <div className="border-t border-border/40 my-0.5" />

          {/* ── ADJUSTMENTS ── */}
          <Section title="Adjustments" defaultOpen={false}>
            <SliderRow
              label="Brightness"
              value={brightness}
              min={-100}
              max={100}
              display={brightness > 0 ? `+${brightness}` : `${brightness}`}
              onChange={(v) => {
                setBrightness(v);
                applyAdjustments(v, contrast, saturation);
              }}
              onCommit={() => saveStateRef.current?.()}
            />
            <SliderRow
              label="Contrast"
              value={contrast}
              min={-100}
              max={100}
              display={contrast > 0 ? `+${contrast}` : `${contrast}`}
              onChange={(v) => {
                setContrast(v);
                applyAdjustments(brightness, v, saturation);
              }}
              onCommit={() => saveStateRef.current?.()}
            />
            <SliderRow
              label="Saturation"
              value={saturation}
              min={-100}
              max={100}
              display={saturation > 0 ? `+${saturation}` : `${saturation}`}
              onChange={(v) => {
                setSaturation(v);
                applyAdjustments(brightness, contrast, v);
              }}
              onCommit={() => saveStateRef.current?.()}
            />
            <button
              onClick={() => {
                setBrightness(0);
                setContrast(0);
                setSaturation(0);
                applyAdjustments(0, 0, 0);
                saveStateRef.current?.();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <RotateCcw size={11} /> Reset adjustments
            </button>
          </Section>

          <div className="border-t border-border/40 my-0.5" />

          {/* ── DELETE ── */}
          <div className="pt-2">
            <button
              onClick={handleDelete}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 size={12} strokeWidth={1.8} />
              Remove image
            </button>
          </div>
        </div>
      </>
    );
  },
);

export default CanvasImagePanel;
