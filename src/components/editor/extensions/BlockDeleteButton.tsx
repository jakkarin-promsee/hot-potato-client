import { Trash2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useEditorI18n } from "../editor.i18n";

interface BlockDeleteButtonProps {
  editor: Editor;
  getPos: (() => number | undefined) | boolean;
}

export function deleteBlock(
  editor: Editor,
  getPos: (() => number | undefined) | boolean,
): boolean {
  if (typeof getPos !== "function") return false;

  const pos = getPos();
  if (typeof pos !== "number") return false;

  const node = editor.state.doc.nodeAt(pos);
  if (!node) return false;

  editor
    .chain()
    .focus()
    .deleteRange({ from: pos, to: pos + node.nodeSize })
    .run();
  return true;
}

export default function BlockDeleteButton({
  editor,
  getPos,
}: BlockDeleteButtonProps) {
  const { t } = useEditorI18n();

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        deleteBlock(editor, getPos);
      }}
      className="flex h-6 w-6 items-center justify-center rounded text-gray-300 transition hover:bg-red-50 hover:text-red-500"
      aria-label={t("Delete block", "ลบบล็อก")}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
