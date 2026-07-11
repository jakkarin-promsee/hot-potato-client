import { useState, useRef, memo, useEffect, useCallback } from "react";
import {
  LayoutTemplate,
  Shapes,
  Type,
  Upload,
  Pencil,
  Search,
  Square,
  Circle as LucideCircle,
  Triangle,
  Star,
  Diamond,
  Minus,
  ArrowRight,
  ArrowLeftRight,
  Spline,
  Heading1,
  Heading2,
  AlignLeft,
  Brush,
  Link2,
  ExternalLink,
  X,
} from "lucide-react";
import { useCanvasContext, SelectedCategory } from "@/contexts/CanvasContext";
import {
  FabricObject,
  Rect,
  Circle as FabricCircle,
  Shadow,
  Textbox,
} from "fabric";
import { useFabric, type LineStyle, type ArrowType } from "@/hooks/useFabric";
import { useUploadStore } from "@/stores/cloudinary.store";
import { useCategoryStore } from "@/stores/category.store";
import CloudinaryUpload from "@/components/CloudinaryUpload";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: {
  id: SelectedCategory;
  icon: React.ElementType;
  label: string;
}[] = [
  { id: "templates", icon: LayoutTemplate, label: "Templates" },
  { id: "elements", icon: Shapes, label: "Elements" },
  { id: "text", icon: Type, label: "Text" },
  { id: "uploads", icon: Upload, label: "Uploads" },
  { id: "draw", icon: Pencil, label: "Draw" },
];

const SHAPES = [
  { type: "rect", icon: Square, label: "Rectangle" },
  { type: "circle", icon: LucideCircle, label: "Circle" },
  { type: "triangle", icon: Triangle, label: "Triangle" },
  { type: "star", icon: Star, label: "Star" },
  { type: "diamond", icon: Diamond, label: "Diamond" },
];

interface ConnectorPreset {
  label: string;
  icon: React.ElementType;
  lineStyle: LineStyle;
  srcArrow: ArrowType;
  dstArrow: ArrowType;
}

const CONNECTOR_PRESETS: ConnectorPreset[] = [
  {
    label: "Line",
    icon: Minus,
    lineStyle: "solid",
    srcArrow: "none",
    dstArrow: "none",
  },
  {
    label: "Arrow",
    icon: ArrowRight,
    lineStyle: "solid",
    srcArrow: "none",
    dstArrow: "arrow",
  },
  {
    label: "Double",
    icon: ArrowLeftRight,
    lineStyle: "solid",
    srcArrow: "arrow",
    dstArrow: "arrow",
  },
  {
    label: "Dashed",
    icon: Spline,
    lineStyle: "dashed",
    srcArrow: "none",
    dstArrow: "arrow",
  },
  {
    label: "Dotted",
    icon: Spline,
    lineStyle: "dotted",
    srcArrow: "none",
    dstArrow: "arrow",
  },
  {
    label: "Open Arrow",
    icon: ArrowRight,
    lineStyle: "solid",
    srcArrow: "none",
    dstArrow: "open",
  },
  {
    label: "Circle End",
    icon: ArrowRight,
    lineStyle: "solid",
    srcArrow: "none",
    dstArrow: "circle",
  },
  {
    label: "Diamond End",
    icon: ArrowRight,
    lineStyle: "solid",
    srcArrow: "none",
    dstArrow: "diamond",
  },
  {
    label: "Square End",
    icon: ArrowRight,
    lineStyle: "solid",
    srcArrow: "none",
    dstArrow: "square",
  },
];

const BRUSH_COLORS = [
  "#1a1a2e",
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e91e63",
];

const TEMPLATES = [
  {
    name: "Social Post",
    preview: "📱",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        fill: "#6c5ce7",
      },
      {
        type: "itext",
        left: 150,
        top: 200,
        text: "Hello World!",
        fontSize: 48,
        fontWeight: "bold",
        fill: "#ffffff",
        fontFamily: "Inter",
      },
      {
        type: "itext",
        left: 150,
        top: 280,
        text: "Your amazing design starts here",
        fontSize: 18,
        fill: "#dfe6e9",
        fontFamily: "Inter",
      },
    ],
  },
  {
    name: "Presentation",
    preview: "📊",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        fill: "#2d3436",
      },
      {
        type: "rect",
        left: 40,
        top: 40,
        width: 720,
        height: 520,
        fill: "#636e72",
        rx: 12,
        ry: 12,
      },
      {
        type: "itext",
        left: 100,
        top: 120,
        text: "Slide Title",
        fontSize: 40,
        fontWeight: "bold",
        fill: "#ffffff",
        fontFamily: "Inter",
      },
      {
        type: "itext",
        left: 100,
        top: 200,
        text: "• Point one\n• Point two\n• Point three",
        fontSize: 20,
        fill: "#b2bec3",
        fontFamily: "Inter",
      },
    ],
  },
  {
    name: "Business Card",
    preview: "💼",
    objects: [
      {
        type: "rect",
        left: 100,
        top: 100,
        width: 600,
        height: 350,
        fill: "#ffffff",
        rx: 16,
        ry: 16,
        shadow: new Shadow({ color: "rgba(0,0,0,0.15)", blur: 20 }),
      },
      {
        type: "rect",
        left: 100,
        top: 100,
        width: 600,
        height: 8,
        fill: "#6c5ce7",
      },
      {
        type: "itext",
        left: 140,
        top: 160,
        text: "Jane Smith",
        fontSize: 28,
        fontWeight: "bold",
        fill: "#2d3436",
        fontFamily: "Inter",
      },
      {
        type: "itext",
        left: 140,
        top: 210,
        text: "Creative Director",
        fontSize: 16,
        fill: "#636e72",
        fontFamily: "Inter",
      },
      {
        type: "itext",
        left: 140,
        top: 280,
        text: "jane@studio.com\n+1 (555) 0123",
        fontSize: 14,
        fill: "#636e72",
        fontFamily: "Inter",
      },
    ],
  },
  {
    name: "Poster",
    preview: "🎨",
    objects: [
      {
        type: "rect",
        left: 0,
        top: -50,
        width: 800,
        height: 600,
        fill: "#0984e3",
      },
      {
        type: "circle",
        left: 550,
        top: -50,
        radius: 200,
        fill: "#74b9ff",
        opacity: 0.5,
      },
      {
        type: "circle",
        left: -50,
        top: 350,
        radius: 180,
        fill: "#a29bfe",
        opacity: 0.4,
      },
      {
        type: "itext",
        left: 60,
        top: 180,
        text: "CREATIVE\nDESIGN",
        fontSize: 64,
        fontWeight: "bold",
        fill: "#ffffff",
        fontFamily: "Inter",
        lineHeight: 1.1,
      },
      {
        type: "itext",
        left: 60,
        top: 380,
        text: "FESTIVAL 2025",
        fontSize: 24,
        fill: "#dfe6e9",
        fontFamily: "Inter",
        charSpacing: 400,
      },
    ],
  },
];

// ─── Primitives ───────────────────────────────────────────────────────────────

const CategoryBtn = memo(
  ({
    icon: Icon,
    label,
    isActive,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-lg px-1 py-3 w-full transition-all duration-150 ${
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      }`}
    >
      {isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-primary" />
      )}
      <Icon size={19} strokeWidth={isActive ? 2 : 1.8} />
      <span className="text-[10px] font-semibold tracking-wide leading-none">
        {label}
      </span>
    </button>
  ),
);

const PanelLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 block">
    {children}
  </span>
);

const ToolBtn = memo(
  ({
    icon: Icon,
    label,
    onClick,
    active = false,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <Icon size={16} strokeWidth={1.8} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  ),
);

// ─── Gallery Modal ────────────────────────────────────────────────────────────

const GalleryModal = memo(({ onClose }: { onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div className="relative z-10 w-[90vw] max-w-5xl h-[85vh] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">
          Image Vault
        </span>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <CloudinaryUpload />
      </div>
    </div>
  </div>
));

// ─── Canvas Media Panel ───────────────────────────────────────────────────────
// Same as editor's MediaPanel but calls `addImage` from useFabric instead of
// editor.chain().setImage(). The vault grid, upload buttons, URL input, category
// filter pills, and gallery modal are all identical.

const CanvasMediaPanel = memo(
  ({ onInsertImage }: { onInsertImage: (src: string) => void }) => {
    const {
      history,
      fetchHistory,
      isFetching,
      upload,
      uploadFromUrl,
      isUploading,
      progress,
    } = useUploadStore();
    const { categories, fetchCategories } = useCategoryStore();

    const [urlInput, setUrlInput] = useState("");
    const [showUrlBox, setShowUrlBox] = useState(false);
    const [activeCatId, setActiveCatId] = useState<string | null>(null);
    const [showGallery, setShowGallery] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      fetchHistory();
      fetchCategories();
    }, []);

    const uploadCategoryId = activeCatId;

    const filtered = activeCatId
      ? history.filter((img) => img.category_id === activeCatId)
      : history;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file, uploadCategoryId);
      e.target.value = "";
    };

    const handleUrlInsert = () => {
      if (!urlInput.trim()) return;
      uploadFromUrl(urlInput.trim(), uploadCategoryId);
      setUrlInput("");
      setShowUrlBox(false);
    };

    return (
      <div className="flex flex-col gap-1">
        {/* ── Upload buttons ── */}
        <PanelLabel>Upload</PanelLabel>

        <div className="px-2 flex flex-col gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/70 px-3 py-3 text-sm font-medium text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={15} strokeWidth={2} />
            {isUploading ? `Uploading… ${progress}%` : "Upload from device"}
          </button>

          <button
            onClick={() => setShowUrlBox((v) => !v)}
            className={`flex items-center justify-center gap-2 w-full rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all ${
              showUrlBox
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:bg-accent hover:border-border text-foreground"
            }`}
          >
            <Link2 size={15} strokeWidth={2} />
            Upload from URL
          </button>

          {showUrlBox && (
            <div className="flex gap-1.5">
              <input
                autoFocus
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUrlInsert();
                  if (e.key === "Escape") setShowUrlBox(false);
                }}
                placeholder="https://…"
                className="flex-1 min-w-0 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                onClick={handleUrlInsert}
                disabled={!urlInput.trim() || isUploading}
                className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground disabled:opacity-40 transition-colors hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          )}

          {isUploading && (
            <div className="h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* ── Manage gallery ── */}
        <div className="px-2 pt-1">
          <button
            onClick={() => setShowGallery(true)}
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-background hover:bg-accent px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink size={12} strokeWidth={1.8} />
            Manage gallery
          </button>
        </div>

        {/* ── Category filter pills ── */}
        <PanelLabel>
          Filter
          {activeCatId
            ? " — uploading to this group"
            : " — uploading uncategorized"}
        </PanelLabel>
        <div className="px-2 flex flex-wrap gap-1 pb-1">
          <button
            onClick={() => setActiveCatId(null)}
            className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
              activeCatId === null
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() =>
                setActiveCatId(activeCatId === cat._id ? null : cat._id)
              }
              className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors truncate max-w-20 ${
                activeCatId === cat._id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* ── Image grid ── */}
        <PanelLabel>Vault ({filtered.length})</PanelLabel>

        {isFetching ? (
          <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-md bg-accent animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] text-muted-foreground/40">
            No images yet
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
            {filtered.map((img) => (
              <button
                key={img.public_id}
                onClick={() => onInsertImage(img.secure_url)}
                title={img.original_filename}
                className="group relative aspect-square overflow-hidden rounded-md border border-border hover:border-primary transition-all"
              >
                <img
                  src={img.secure_url}
                  alt={img.original_filename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-[10px] font-medium">
                    Insert
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Gallery modal */}
        {showGallery && (
          <GalleryModal
            onClose={() => {
              setShowGallery(false);
              fetchHistory();
            }}
          />
        )}
      </div>
    );
  },
);

// ─── ConnectorPreview ─────────────────────────────────────────────────────────

const ConnectorPreview = memo(
  ({
    lineStyle,
    srcArrow,
    dstArrow,
  }: Pick<ConnectorPreset, "lineStyle" | "srcArrow" | "dstArrow">) => {
    const dash =
      lineStyle === "dashed"
        ? "5,3"
        : lineStyle === "dotted"
          ? "1.5,3"
          : undefined;
    const arrowHead = (type: ArrowType, flip: boolean) => {
      if (type === "none") return null;
      const transform = flip ? "scale(-1,1) translate(-28,0)" : "";
      switch (type) {
        case "arrow":
          return (
            <polygon
              points="28,5 20,2 22,5 20,8"
              fill="currentColor"
              transform={transform}
            />
          );
        case "open":
          return (
            <polyline
              points="26,2 28,5 26,8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              transform={transform}
            />
          );
        case "circle":
          return (
            <circle
              cx="26"
              cy="5"
              r="2.5"
              fill="currentColor"
              transform={transform}
            />
          );
        case "square":
          return (
            <rect
              x="24"
              y="3"
              width="4"
              height="4"
              fill="currentColor"
              transform={transform}
            />
          );
        case "diamond":
          return (
            <polygon
              points="28,5 25,3 22,5 25,7"
              fill="currentColor"
              transform={transform}
            />
          );
        default:
          return null;
      }
    };
    return (
      <svg viewBox="0 0 56 10" className="w-full h-4 text-muted-foreground">
        <line
          x1={srcArrow !== "none" ? 6 : 2}
          y1="5"
          x2={dstArrow !== "none" ? 50 : 54}
          y2="5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={dash}
          strokeLinecap="round"
        />
        {arrowHead(dstArrow, false)}
        <g transform="translate(0,0)">{arrowHead(srcArrow, true)}</g>
      </svg>
    );
  },
);

// ─── Panels ───────────────────────────────────────────────────────────────────

const TemplatesPanel = memo(
  ({
    search,
    onApply,
  }: {
    search: string;
    onApply: (t: (typeof TEMPLATES)[0]) => void;
  }) => (
    <div className="flex flex-col gap-1">
      <PanelLabel>Templates</PanelLabel>
      <div className="grid grid-cols-2 gap-2 px-1">
        {TEMPLATES.filter((t) =>
          t.name.toLowerCase().includes(search.toLowerCase()),
        ).map((t) => (
          <button
            key={t.name}
            onClick={() => onApply(t)}
            className="bg-accent/40 rounded-lg p-3 text-center hover:bg-accent transition-colors group"
          >
            <span className="text-2xl block mb-1">{t.preview}</span>
            <span className="text-[11px] text-muted-foreground group-hover:text-foreground">
              {t.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  ),
);

const ElementsPanel = memo(
  ({
    search,
    onAddShape,
    onAddConnector,
  }: {
    search: string;
    onAddShape: (type: string) => void;
    onAddConnector: (preset: ConnectorPreset) => void;
  }) => {
    const filteredShapes = SHAPES.filter((s) =>
      s.label.toLowerCase().includes(search.toLowerCase()),
    );
    const filteredConnectors = CONNECTOR_PRESETS.filter((c) =>
      c.label.toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <div className="flex flex-col gap-1">
        {filteredShapes.length > 0 && (
          <>
            <PanelLabel>Shapes</PanelLabel>
            <div className="grid grid-cols-3 gap-1.5 px-1">
              {filteredShapes.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => onAddShape(type)}
                  className="bg-accent/40 rounded-lg p-3 flex flex-col items-center gap-1.5 hover:bg-accent transition-colors group"
                >
                  <Icon
                    size={22}
                    className="text-muted-foreground group-hover:text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {filteredConnectors.length > 0 && (
          <>
            <PanelLabel>Connectors</PanelLabel>
            <div className="grid grid-cols-2 gap-1.5 px-1">
              {filteredConnectors.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onAddConnector(preset)}
                  className="bg-accent/40 rounded-lg px-3 py-2.5 flex flex-col gap-2 hover:bg-accent transition-colors group text-left"
                >
                  <ConnectorPreview
                    lineStyle={preset.lineStyle}
                    srcArrow={preset.srcArrow}
                    dstArrow={preset.dstArrow}
                  />
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground leading-none">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  },
);

const TextPanel = memo(
  ({
    onAdd,
  }: {
    onAdd: (preset: "heading" | "subheading" | "body") => void;
  }) => (
    <div className="flex flex-col gap-0.5">
      <PanelLabel>Insert</PanelLabel>
      <ToolBtn
        icon={Heading1}
        label="Heading"
        onClick={() => onAdd("heading")}
      />
      <ToolBtn
        icon={Heading2}
        label="Subheading"
        onClick={() => onAdd("subheading")}
      />
      <ToolBtn
        icon={AlignLeft}
        label="Body text"
        onClick={() => onAdd("body")}
      />
    </div>
  ),
);

const DrawPanel = memo(
  ({
    isDrawing,
    brushSize,
    brushColor,
    onToggle,
    onBrushSize,
    onBrushColor,
  }: {
    isDrawing: boolean;
    brushSize: number;
    brushColor: string;
    onToggle: () => void;
    onBrushSize: (n: number) => void;
    onBrushColor: (c: string) => void;
  }) => (
    <div className="flex flex-col gap-3 px-1">
      <PanelLabel>Drawing</PanelLabel>
      <button
        onClick={onToggle}
        className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
          isDrawing
            ? "bg-primary text-primary-foreground"
            : "bg-accent/40 text-muted-foreground hover:bg-accent"
        }`}
      >
        <Brush size={16} />
        {isDrawing ? "Stop Drawing" : "Start Drawing"}
      </button>
      <div>
        <PanelLabel>Brush Size: {brushSize}px</PanelLabel>
        <input
          type="range"
          min={1}
          max={30}
          value={brushSize}
          onChange={(e) => onBrushSize(Number(e.target.value))}
          className="w-full accent-primary mt-1"
        />
      </div>
      <div>
        <PanelLabel>Color</PanelLabel>
        <div className="flex flex-wrap gap-2 pt-1">
          {BRUSH_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onBrushColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${brushColor === c ? "border-primary scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  ),
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function CanvasLeftSidebar() {
  const { selectedCategory, setSelectedCategory, canvas, saveStateRef } =
    useCanvasContext();
  const [search, setSearch] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSizeLocal] = useState(4);
  const [brushColor, setBrushColorLocal] = useState("#1a1a2e");

  const {
    addShape,
    addRichLine,
    addImage,
    addText,
    toggleDrawing,
    setBrushSize,
    setBrushColor,
  } = useFabric();

  const activeCategory = selectedCategory ?? "templates";

  // ── Template apply ──────────────────────────────────────────────────────────

  const applyTemplate = (template: (typeof TEMPLATES)[0]) => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    template.objects.forEach((objData: any) => {
      const { type, ...options } = objData;
      let obj: FabricObject;
      if (type === "rect") {
        obj = new Rect(options);
      } else if (type === "circle") {
        obj = new FabricCircle(options);
      } else if (type === "itext" || type === "textbox") {
        const { text, ...textOptions } = options;
        obj = new Textbox(text || "", {
          ...textOptions,
          width: textOptions.width || 500,
        });
      } else return;
      canvas.add(obj);
    });
    canvas.renderAll();
    saveStateRef.current?.();
  };

  // ── Connector ───────────────────────────────────────────────────────────────

  const handleAddConnector = (preset: ConnectorPreset) => {
    addRichLine({
      lineStyle: preset.lineStyle,
      srcArrow: preset.srcArrow,
      dstArrow: preset.dstArrow,
    });
  };

  // ── Insert image from vault into canvas ─────────────────────────────────────

  const handleInsertImage = useCallback(
    (src: string) => {
      addImage(src);
    },
    [addImage],
  );

  // ── Draw mode ───────────────────────────────────────────────────────────────

  const toggleDraw = () => {
    const next = !isDrawing;
    setIsDrawing(next);
    toggleDrawing(next, brushSize);
  };

  const handleBrushSize = (size: number) => {
    setBrushSizeLocal(size);
    setBrushSize(size);
  };

  const handleBrushColor = (color: string) => {
    setBrushColorLocal(color);
    setBrushColor(color);
  };

  // ── Panel renderer ──────────────────────────────────────────────────────────

  const renderPanel = () => {
    switch (activeCategory) {
      case "templates":
        return <TemplatesPanel search={search} onApply={applyTemplate} />;
      case "elements":
        return (
          <ElementsPanel
            search={search}
            onAddShape={addShape}
            onAddConnector={handleAddConnector}
          />
        );
      case "text":
        return <TextPanel onAdd={addText} />;
      case "uploads":
        return <CanvasMediaPanel onInsertImage={handleInsertImage} />;
      case "draw":
        return (
          <DrawPanel
            isDrawing={isDrawing}
            brushSize={brushSize}
            brushColor={brushColor}
            onToggle={toggleDraw}
            onBrushSize={handleBrushSize}
            onBrushColor={handleBrushColor}
          />
        );
    }
  };

  return (
    <div className="editor-sidebar-left flex h-full border-r border-border bg-editor-surface">
      {/* ── Icon rail ── */}
      <div className="flex w-20 flex-col items-center gap-1.5 border-r border-border/60 px-2 py-3">
        {CATEGORIES.map(({ id, icon, label }) => (
          <CategoryBtn
            key={id}
            icon={icon}
            label={label}
            isActive={activeCategory === id}
            onClick={() =>
              setSelectedCategory(activeCategory === id ? null : id)
            }
          />
        ))}
      </div>

      {/* ── Tool panel ── */}
      <div className="flex w-60 flex-col overflow-y-auto p-2.5">
        {/* Search bar — shown for templates & elements */}
        {(activeCategory === "templates" || activeCategory === "elements") && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-2">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-transparent text-xs text-foreground outline-none flex-1 placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {/* Panel title */}
        <p className="mb-1 px-1 text-sm font-semibold text-foreground capitalize">
          {activeCategory}
        </p>

        {renderPanel()}
      </div>
    </div>
  );
}
