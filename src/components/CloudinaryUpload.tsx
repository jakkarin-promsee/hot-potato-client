import { useCallback, useEffect, useRef, useState } from "react";
import { useUploadStore } from "@/stores/cloudinary.store";
import { useCategoryStore } from "@/stores/category.store";
import { QUICK_TRANSFORMS, applyTransform } from "@/lib/cloudinary";
import { formatBytes, formatDate, formatDimensions } from "@/lib/format";
import type { UploadedImage } from "@/types/cloudinary.types";

const BADGE_STYLES = {
  zinc: "bg-zinc-800/60 text-zinc-300 border-zinc-700/50",
  violet: "bg-violet-800/60 text-violet-300 border-violet-700/50",
} as const;

function Badge({
  children,
  color = "zinc",
}: {
  children: React.ReactNode;
  color?: keyof typeof BADGE_STYLES;
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${BADGE_STYLES[color]}`}
    >
      {children}
    </span>
  );
}

function resolveUploadCategoryId(
  activeCategoryId: string | null,
): string | null {
  return activeCategoryId === "__none__" ? null : activeCategoryId;
}

interface CloudinaryUploadProps {
  /** Full-page route shows the Image Vault header; editor sidebar omits it. */
  showHeader?: boolean;
}

export default function CloudinaryUpload({ showHeader = false }: CloudinaryUploadProps) {
  const {
    isUploading,
    progress,
    error,
    previewUrl,
    history,
    selectedImage,
    isFetching,
    upload,
    uploadFromUrl,
    selectImage,
    deleteImage,
    clearHistory,
    fetchHistory,
    assignCategory,
  } = useUploadStore();

  const { categories, fetchCategories, createCategory, deleteCategory } =
    useCategoryStore();

  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
    fetchCategories();
  }, []);

  const filteredHistory: UploadedImage[] =
    activeCategoryId === null
      ? history
      : activeCategoryId === "__none__"
        ? history.filter((img) => !img.category_id)
        : history.filter((img) => img.category_id === activeCategoryId);

  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c._id === id)?.name ?? "Unknown") : null;

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file) upload(file, resolveUploadCategoryId(activeCategoryId));
    },
    [upload, activeCategoryId],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
      e.target.value = "";
    },
    [handleFile],
  );

  const copyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    await createCategory(newCatName.trim());
    setNewCatName("");
    setShowNewCat(false);
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim() || isUploading) return;
    uploadFromUrl(urlInput.trim(), resolveUploadCategoryId(activeCategoryId));
    setUrlInput("");
    setShowUrlInput(false);
  };

  return (
    <div
      className="min-h-screen bg-[#0e0e10] text-zinc-100"
      style={{ fontFamily: "'DM Mono', 'Fira Code', monospace" }}
    >
      {showHeader && (
        <header className="h-12 border-b border-white/6 flex items-center px-5 gap-4 sticky top-0 z-30 bg-[#0e0e10]/90 backdrop-blur-sm">
          <div className="w-5 h-5 rounded bg-violet-500 flex items-center justify-center shrink-0">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 1C3.24 1 1 3.24 1 6s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 2.5c.83 0 1.5.67 1.5 1.5S6.83 6.5 6 6.5 4.5 5.83 4.5 5 5.17 3.5 6 3.5zM6 9.9C4.83 9.9 3.8 9.32 3.16 8.44A3.5 3.5 0 0 1 6 7.5c1.07 0 2.02.48 2.84 1.44A3.98 3.98 0 0 1 6 9.9z"
                fill="white"
              />
            </svg>
          </div>
          <span className="text-[11px] font-semibold tracking-[0.18em] text-zinc-400 uppercase">
            Image Vault
          </span>
          <div className="ml-auto flex items-center gap-3 text-[11px] text-zinc-600">
            <span>{history.length} files</span>
            <span>·</span>
            <span>{categories.length} groups</span>
          </div>
        </header>
      )}

      <div className="flex h-[calc(100vh-48px)]">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-white/6 flex flex-col overflow-y-auto">
          <div className="px-4 pt-5 pb-3">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-600 uppercase mb-3">
              Groups
            </p>

            <button
              onClick={() => setActiveCategoryId(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-[12px] mb-1 transition-colors flex items-center justify-between ${
                activeCategoryId === null
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-zinc-400 hover:bg-white/4 hover:text-zinc-200"
              }`}
            >
              <span>All images</span>
              <span className="text-[10px] text-zinc-600">
                {history.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategoryId("__none__")}
              className={`w-full text-left px-3 py-2 rounded-lg text-[12px] mb-1 transition-colors flex items-center justify-between ${
                activeCategoryId === "__none__"
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-zinc-400 hover:bg-white/4 hover:text-zinc-200"
              }`}
            >
              <span>Uncategorized</span>
              <span className="text-[10px] text-zinc-600">
                {history.filter((i) => !i.category_id).length}
              </span>
            </button>

            {categories.length > 0 && (
              <div className="mt-3 mb-1">
                <p className="text-[10px] text-zinc-700 px-3 mb-1 tracking-widest">
                  — folders
                </p>
                {categories.map((cat) => {
                  const count = history.filter(
                    (i) => i.category_id === cat._id,
                  ).length;
                  return (
                    <div key={cat._id} className="group flex items-center">
                      <button
                        onClick={() => setActiveCategoryId(cat._id)}
                        className={`flex-1 text-left px-3 py-2 rounded-lg text-[12px] transition-colors flex items-center justify-between ${
                          activeCategoryId === cat._id
                            ? "bg-violet-500/15 text-violet-300"
                            : "text-zinc-400 hover:bg-white/4 hover:text-zinc-200"
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <span className="text-[10px] text-zinc-600 ml-1 shrink-0">
                          {count}
                        </span>
                      </button>
                      <button
                        onClick={() => deleteCategory(cat._id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 text-[10px] px-1 transition-all"
                        title="Delete group"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-4 pb-4 mt-auto">
            {showNewCat ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory();
                    if (e.key === "Escape") setShowNewCat(false);
                  }}
                  placeholder="Group name…"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-[12px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500"
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleCreateCategory}
                    className="flex-1 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewCat(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[11px] transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewCat(true)}
                className="w-full py-2 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                + New group
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Upload mode toggle */}
            <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-1 w-fit">
              <button
                onClick={() => setShowUrlInput(false)}
                className={`px-3 py-1 rounded text-[11px] transition-colors ${
                  !showUrlInput
                    ? "bg-zinc-700 text-zinc-200"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                File
              </button>
              <button
                onClick={() => setShowUrlInput(true)}
                className={`px-3 py-1 rounded text-[11px] transition-colors ${
                  showUrlInput
                    ? "bg-zinc-700 text-zinc-200"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                From URL
              </button>
            </div>

            {/* File drop zone */}
            {!showUrlInput && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={[
                  "relative border border-dashed rounded-xl cursor-pointer transition-all duration-200",
                  "flex items-center justify-center overflow-hidden",
                  isDragging
                    ? "border-violet-500 bg-violet-500/10 h-28"
                    : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 h-20",
                  isUploading ? "cursor-not-allowed" : "",
                ].join(" ")}
              >
                {isUploading && previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-10"
                    />
                    <div className="relative z-10 w-full max-w-xs px-6 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">Uploading…</span>
                        <span className="text-violet-400 font-semibold">
                          {progress}%
                        </span>
                      </div>
                      <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 transition-all duration-300 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-zinc-600 select-none">
                    <span className="text-lg">↑</span>
                    <span className="text-[12px]">
                      {isDragging
                        ? "Release to upload"
                        : "Drop image or click to browse"}
                      {activeCategoryId && activeCategoryId !== "__none__" && (
                        <span className="ml-2 text-violet-500 text-[11px]">
                          → {categoryName(activeCategoryId)}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* URL input */}
            {showUrlInput && (
              <div
                className={[
                  "flex items-center gap-3 border rounded-xl px-4 h-20 transition-all",
                  isUploading
                    ? "border-violet-600/50 bg-violet-950/20"
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/40",
                ].join(" ")}
              >
                {isUploading ? (
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Saving from URL…</span>
                      <span className="text-violet-400 font-semibold">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 transition-all duration-300 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-zinc-700 text-[13px] shrink-0">
                      ↗
                    </span>
                    <input
                      autoFocus
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUrlSubmit();
                      }}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 bg-transparent text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none font-mono"
                    />
                    {activeCategoryId && activeCategoryId !== "__none__" && (
                      <span className="text-violet-500 text-[11px] shrink-0">
                        → {categoryName(activeCategoryId)}
                      </span>
                    )}
                    <button
                      onClick={handleUrlSubmit}
                      disabled={!urlInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[11px] transition-colors shrink-0"
                    >
                      Save
                    </button>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-950/40 border border-red-900/50 px-4 py-2.5 text-[12px] text-red-400 flex items-center justify-between">
                <span>✕ {error}</span>
                <button
                  onClick={() => useUploadStore.getState().clearError()}
                  className="text-red-700 hover:text-red-400 text-[11px] ml-4"
                >
                  dismiss
                </button>
              </div>
            )}

            {/* Gallery header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-[13px] font-semibold text-zinc-300">
                  {activeCategoryId === null
                    ? "All images"
                    : activeCategoryId === "__none__"
                      ? "Uncategorized"
                      : categoryName(activeCategoryId)}
                </h2>
                <span className="text-[11px] text-zinc-600">
                  {filteredHistory.length} files
                </span>
              </div>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[11px] text-zinc-700 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Grid */}
            {isFetching ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-zinc-900 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 flex items-center justify-center h-48 text-[12px] text-zinc-700">
                {activeCategoryId
                  ? "No images in this group"
                  : "No uploads yet"}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {filteredHistory.map((img) => {
                  const isSelected = selectedImage?.public_id === img.public_id;
                  const cat = img.category_id
                    ? categories.find((c) => c._id === img.category_id)
                    : null;
                  return (
                    <div
                      key={img.public_id}
                      onClick={() => selectImage(isSelected ? null : img)}
                      className={[
                        "relative group aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-150",
                        isSelected
                          ? "border-violet-500 ring-1 ring-violet-500/30"
                          : "border-transparent hover:border-zinc-700",
                      ].join(" ")}
                    >
                      <img
                        src={img.secure_url}
                        alt={img.original_filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {cat && (
                        <div className="absolute top-1 left-1">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-violet-300 border border-violet-800/50 truncate max-w-20 block">
                            {cat.name}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end justify-between p-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteImage(img.public_id);
                          }}
                          className="text-[10px] bg-red-900/80 hover:bg-red-700 text-red-300 rounded px-1.5 py-0.5 transition-colors"
                        >
                          ✕
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningId(
                              assigningId === img.public_id
                                ? null
                                : img.public_id,
                            );
                          }}
                          className="text-[10px] bg-zinc-900/80 hover:bg-zinc-700 text-zinc-300 rounded px-1.5 py-0.5 transition-colors"
                        >
                          folder
                        </button>
                      </div>
                      {assigningId === img.public_id && (
                        <div
                          className="absolute bottom-8 right-1 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-1.5 min-w-30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              assignCategory(img.public_id, null);
                              setAssigningId(null);
                            }}
                            className="w-full text-left px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                          >
                            Remove group
                          </button>
                          {categories.map((cat) => (
                            <button
                              key={cat._id}
                              onClick={() => {
                                assignCategory(img.public_id, cat._id);
                                setAssigningId(null);
                              }}
                              className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors ${
                                img.category_id === cat._id
                                  ? "text-violet-300 bg-violet-500/10"
                                  : "text-zinc-300 hover:bg-zinc-800"
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedImage && (
            <aside className="w-72 shrink-0 border-l border-white/6 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-[0.15em] text-zinc-600 uppercase">
                    Details
                  </span>
                  <button
                    onClick={() => selectImage(null)}
                    className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
                  <img
                    src={selectedImage.secure_url}
                    alt={selectedImage.original_filename}
                    className="w-full max-h-52 object-contain"
                  />
                </div>

                <div>
                  <p className="text-[13px] text-zinc-200 font-semibold truncate">
                    {selectedImage.original_filename}
                  </p>
                  <p className="text-[11px] text-zinc-600 mt-0.5 flex items-center gap-2">
                    <Badge>{selectedImage.format.toUpperCase()}</Badge>
                    <span>
                      {formatDimensions(
                        selectedImage.width,
                        selectedImage.height,
                      )}
                    </span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                    Group
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedImage.category_id ? (
                      <Badge color="violet">
                        {categoryName(selectedImage.category_id)}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-zinc-700">None</span>
                    )}
                  </div>
                  {categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {categories.map((cat) => (
                        <button
                          key={cat._id}
                          onClick={() =>
                            assignCategory(selectedImage.public_id, cat._id)
                          }
                          className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                            selectedImage.category_id === cat._id
                              ? "border-violet-600 bg-violet-600/20 text-violet-300"
                              : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                      {selectedImage.category_id && (
                        <button
                          onClick={() =>
                            assignCategory(selectedImage.public_id, null)
                          }
                          className="px-2 py-0.5 rounded-full text-[10px] border border-zinc-800 text-zinc-700 hover:text-red-400 hover:border-red-900 transition-colors"
                        >
                          remove
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-[11px]">
                  {(
                    [
                      ["Size", formatBytes(selectedImage.bytes)],
                      ["Uploaded", formatDate(selectedImage.created_at)],
                      ["Public ID", selectedImage.public_id],
                    ] as [string, string][]
                  ).map(([label, val]) => (
                    <div key={label} className="flex gap-2 items-start">
                      <span className="text-zinc-600 w-20 shrink-0 pt-px">
                        {label}
                      </span>
                      <span className="text-zinc-400 break-all font-mono leading-relaxed">
                        {val}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                    URL
                  </p>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                    <code className="text-[10px] text-violet-400 flex-1 truncate">
                      {selectedImage.secure_url}
                    </code>
                    <button
                      onClick={() =>
                        copyUrl(
                          selectedImage.secure_url,
                          selectedImage.public_id,
                        )
                      }
                      className={`text-[11px] px-2 py-1 rounded shrink-0 transition-colors ${
                        copiedId === selectedImage.public_id
                          ? "bg-green-900/40 text-green-400"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      {copiedId === selectedImage.public_id ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                    Transforms
                  </p>
                  <div className="space-y-1">
                    {QUICK_TRANSFORMS.map(({ label, params }) => {
                      const tUrl = applyTransform(
                        selectedImage.secure_url,
                        params,
                      );
                      const key = `${selectedImage.public_id}-${params}`;
                      return (
                        <div
                          key={params}
                          className="flex items-center justify-between bg-zinc-900 border border-zinc-800/50 rounded px-2.5 py-1.5"
                        >
                          <span className="text-[11px] text-zinc-500">
                            {label}
                          </span>
                          <button
                            onClick={() => copyUrl(tUrl, key)}
                            className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                              copiedId === key
                                ? "text-green-400"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            {copiedId === key ? "✓" : "Copy"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
