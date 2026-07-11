import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import Link from "@tiptap/extension-link";
import { SearchHighlightExtension } from "../extensions/SearchHighlight";
import { NumberedSectionHeadingsExtension } from "../extensions/numberedSectionHeadings";
import { OutlineDraftParagraph } from "../extensions/outlineDraftParagraph";
import { FabricCanvasNode } from "../extensions/FabricCanvasNode";
import { QuestionChoiceNode } from "../extensions/QuestionChoiceNode";
import { QuestionWriteNode } from "../extensions/QuestionWriteNode";
import { QuestionBlankWriteNode } from "../extensions/QuestionBlankWriteNode";
import { QuestionBlankChoiceNode } from "../extensions/QuestionBlankChoiceNode";
import { QuestionAgentNode } from "../extensions/QuestionAgentNode";
import { createResizableImage } from "../extensions/ResizableImage";
import { FormulaBlockNode } from "../FormulaBlock";

export const createEditorExtensions = (editable = true) => [
  StarterKit.configure({
    codeBlock: false,
    paragraph: false,
    heading: { levels: [1, 2, 3] },
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
    link: false,
    underline: false,
  }),
  Link.configure({
    openOnClick: !editable, // direct click in viewer, ctrl+click in editor
    HTMLAttributes: {
      class: editable ? "cursor-text" : "cursor-pointer",
    },
  }),
  Markdown.configure({
    html: true,
    tightLists: true,
  }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Underline,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  ...(editable
    ? [
        Placeholder.configure({
          placeholder: "Start writing your lesson...",
        }),
      ]
    : []),
  createResizableImage(editable),
  Youtube.configure({ width: 560, height: 315 }),
  Table.configure({ resizable: editable }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem.configure({ nested: true }),
  SearchHighlightExtension,
  OutlineDraftParagraph,
  NumberedSectionHeadingsExtension,
  FabricCanvasNode,
  FormulaBlockNode,
  QuestionChoiceNode,
  QuestionWriteNode,
  QuestionBlankWriteNode,
  QuestionBlankChoiceNode,
  QuestionAgentNode,
];
