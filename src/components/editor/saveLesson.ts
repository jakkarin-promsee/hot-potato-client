import type { Editor } from "@tiptap/react";
import { useCanvasStore } from "@/stores/canvas.store";

export function isSaveShortcut(
  e: KeyboardEvent | React.KeyboardEvent,
): boolean {
  return Boolean(
    (e.ctrlKey || e.metaKey) &&
      (e.key === "s" || e.key === "S" || e.code === "KeyS"),
  );
}

/** Flush the live TipTap doc into the store, then persist if dirty. */
export async function saveLessonNow(editor?: Editor | null): Promise<void> {
  if (editor) {
    useCanvasStore
      .getState()
      .setTiptapJson(JSON.stringify(editor.getJSON()));
  }
  await useCanvasStore.getState().saveContent();
}
