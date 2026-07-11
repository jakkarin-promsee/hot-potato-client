import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Eye, EyeOff, SquareDashedMousePointer } from "lucide-react";
import { createFormulaRow } from "./formulaReducer";
import { formulaToLatex } from "./formulaToLatex";
import AiFormulaPanel from "./AiFormulaPanel";
import BlockMoveControls from "../extensions/BlockMoveControls";
import {
  setActiveFormulaBlock,
  subscribeFormulaToolbarAction,
} from "./formulaToolbarBus";
import type { FormulaNode, FormulaToolbarAction } from "./types";
import { useEditorI18n } from "../editor.i18n";

type FormulaAttrs = {
  id?: string;
  formula?: FormulaNode;
  latex?: string;
};

const CURSOR_MARKER = "#CURSOR#";

type TemplateInsert = {
  text: string;
  cursorOffset?: number;
};

function createTemplateFromAction(
  action: FormulaToolbarAction,
): TemplateInsert | null {
  switch (action.type) {
    case "insert-symbol":
      return { text: action.value };
    case "insert-power":
      if (action.position === "bottom-right")
        return { text: `_{${CURSOR_MARKER}}` };
      if (action.position === "top-left")
        return { text: `{${CURSOR_MARKER}}^{} ` };
      if (action.position === "bottom-left")
        return { text: `{${CURSOR_MARKER}}_{} ` };
      return { text: `^{${CURSOR_MARKER}}` };
    case "insert-structure":
      if (action.kind === "sqrt") return { text: `\\sqrt{${CURSOR_MARKER}}` };
      if (action.kind === "nth-root")
        return { text: `\\sqrt[${CURSOR_MARKER}]{} ` };
      if (action.kind === "fraction")
        return { text: `\\frac{${CURSOR_MARKER}}{} ` };
      if (action.kind === "abs")
        return { text: `\\left|${CURSOR_MARKER}\\right|` };
      if (action.kind === "paren")
        return { text: `\\left(${CURSOR_MARKER}\\right)` };
      if (action.kind === "bracket")
        return { text: `\\left[${CURSOR_MARKER}\\right]` };
      if (action.kind === "summation")
        return { text: `\\sum_{i=0}^{n} ${CURSOR_MARKER}` };
      if (action.kind === "integral")
        return { text: `\\int_{a}^{b} ${CURSOR_MARKER}\\,dx` };
      if (action.kind === "line-integral")
        return { text: `\\oint_{C} ${CURSOR_MARKER}\\cdot d\\mathbf{r}` };
      return null;
    case "insert-trig":
      return { text: `\\${action.name}\\left(${CURSOR_MARKER}\\right)` };
    case "insert-invtrig":
      return { text: `\\${action.name}^{-1}\\left(${CURSOR_MARKER}\\right)` };
    case "insert-log":
      return { text: `\\log_{10}\\left(${CURSOR_MARKER}\\right)` };
    case "insert-ln":
      return { text: `\\ln\\left(${CURSOR_MARKER}\\right)` };
    case "wrap-fraction":
      return { text: `\\frac{${CURSOR_MARKER}}{} ` };
    case "wrap-power-top-right":
      return { text: `^{${CURSOR_MARKER}}` };
    case "wrap-paren":
      return { text: `\\left(${CURSOR_MARKER}\\right)` };
    default:
      return null;
  }
}

function inferInitialLatex(attrs?: FormulaAttrs): string {
  if (typeof attrs?.latex === "string" && attrs.latex.trim().length > 0) {
    return attrs.latex;
  }
  if (attrs?.formula?.type === "row") {
    return formulaToLatex(attrs.formula);
  }
  return "";
}

export default function FormulaCanvas({
  node,
  selected,
  getPos,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const { t } = useEditorI18n();
  const attrs = node.attrs as FormulaAttrs;
  const [latexInput, setLatexInput] = useState(() => inferInitialLatex(attrs));
  const [activeToolbarBlockId, setActiveToolbarBlockId] = useState<
    string | null
  >(null);
  const [previewMode, setPreviewMode] = useState(false);
  const isEditable = editor.isEditable;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const blockId = useMemo(
    () => attrs.id ?? `formula-block-${Math.random().toString(36).slice(2, 9)}`,
    [attrs.id],
  );

  useEffect(() => {
    if (!attrs.id) updateAttributes({ id: blockId });
  }, [attrs.id, blockId, updateAttributes]);

  useEffect(() => {
    const externalLatex = inferInitialLatex(attrs);
    if (externalLatex !== latexInput) setLatexInput(externalLatex);
  }, [attrs, latexInput]);

  const persistLatex = useCallback(
    (nextLatex: string) => {
      setLatexInput(nextLatex);
      updateAttributes({
        latex: nextLatex,
        formula: createFormulaRow(),
      });
    },
    [updateAttributes],
  );

  const insertTemplate = useCallback(
    (template: TemplateInsert, selectedText?: string) => {
      const textarea = textareaRef.current;
      if (!textarea || !isEditable) return;

      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? 0;
      const replacement =
        selectedText !== undefined
          ? template.text.replace(CURSOR_MARKER, selectedText)
          : template.text;
      const markerIndex = replacement.indexOf(CURSOR_MARKER);
      const plain = replacement.replace(CURSOR_MARKER, "");

      const before = latexInput.slice(0, start);
      const after = latexInput.slice(end);
      const nextLatex = `${before}${plain}${after}`;
      persistLatex(nextLatex);

      requestAnimationFrame(() => {
        textarea.focus();
        if (markerIndex >= 0) {
          const cursor = start + markerIndex;
          textarea.setSelectionRange(cursor, cursor);
          return;
        }
        const fallbackCursor = start + (template.cursorOffset ?? plain.length);
        textarea.setSelectionRange(fallbackCursor, fallbackCursor);
      });
    },
    [isEditable, latexInput, persistLatex],
  );

  const applyToolbarAction = useCallback(
    (action: FormulaToolbarAction) => {
      const template = createTemplateFromAction(action);
      if (!template) return;

      const textarea = textareaRef.current;
      const hasSelection = Boolean(
        textarea &&
        textarea.selectionStart !== textarea.selectionEnd &&
        textarea.selectionStart !== null &&
        textarea.selectionEnd !== null,
      );
      const selectedText =
        hasSelection && textarea
          ? latexInput.slice(textarea.selectionStart, textarea.selectionEnd)
          : undefined;
      if (
        selectedText &&
        (action.type === "wrap-fraction" ||
          action.type === "wrap-power-top-right" ||
          action.type === "wrap-paren")
      ) {
        insertTemplate(template, selectedText);
        return;
      }
      insertTemplate(template);
    },
    [insertTemplate, latexInput],
  );

  useEffect(() => {
    if (!isEditable) return;
    return subscribeFormulaToolbarAction(({ action, targetBlockId }) => {
      if (targetBlockId) {
        if (targetBlockId !== blockId) return;
        applyToolbarAction(action);
        return;
      }
      if (activeToolbarBlockId !== blockId) return;
      applyToolbarAction(action);
    });
  }, [activeToolbarBlockId, applyToolbarAction, blockId, isEditable]);

  const renderResult = useMemo(() => {
    if (!latexInput.trim()) return "";
    try {
      return katex.renderToString(latexInput, {
        throwOnError: false,
        displayMode: true,
        strict: "ignore",
      });
    } catch {
      return "";
    }
  }, [latexInput]);

  const quickTemplates: Array<{ label: string; template: TemplateInsert }> =
    useMemo(
      () => [
        { label: "x²", template: { text: `^{${CURSOR_MARKER}}` } },
        { label: "x₂", template: { text: `_{${CURSOR_MARKER}}` } },
        { label: "a/b", template: { text: `\\frac{${CURSOR_MARKER}}{} ` } },
        { label: "√", template: { text: `\\sqrt{${CURSOR_MARKER}}` } },
        { label: "Σ", template: { text: `\\sum_{i=0}^{n} ${CURSOR_MARKER}` } },
        {
          label: "∫",
          template: { text: `\\int_{a}^{b} ${CURSOR_MARKER}\\,dx` },
        },
        { label: "π", template: { text: "\\pi" } },
        { label: "∞", template: { text: "\\infty" } },
      ],
      [],
    );

  const selectNode = useCallback(() => {
    if (typeof getPos !== "function") return;
    const pos = getPos();
    const nodeSelection = NodeSelection.create(editor.state.doc, pos as number);
    editor.view.dispatch(editor.state.tr.setSelection(nodeSelection));
    editor.view.focus();
  }, [getPos, editor]);

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={
        isEditable
          ? `w-full rounded-md border bg-slate-100 p-2 ${selected ? "border-blue-300" : "border-slate-300"}`
          : "w-full py-0.5"
      }
      contentEditable={false}
      onMouseDownCapture={(event: ReactMouseEvent<HTMLDivElement>) =>
        event.stopPropagation()
      }
      onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
        if (!isEditable) return;
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        setActiveFormulaBlock(blockId);
        setActiveToolbarBlockId(blockId);
        selectNode();
      }}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => {
        if (!isEditable) return;
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        setActiveFormulaBlock(blockId);
        setActiveToolbarBlockId(blockId);
        selectNode();
      }}
    >
      {isEditable ? (
        <>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {previewMode
                ? t("Formula Block (Preview)", "บล็อกสูตร (ตัวอย่าง)")
                : t("Formula Block (LaTeX)", "บล็อกสูตร (LaTeX)")}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <BlockMoveControls editor={editor} getPos={getPos} />
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewMode((value) => !value);
                }}
                className={[
                  "flex h-6 w-6 items-center justify-center rounded transition",
                  previewMode
                    ? "bg-slate-200 text-slate-700"
                    : "text-slate-400 hover:bg-slate-200 hover:text-slate-700",
                ].join(" ")}
                aria-label={
                  previewMode
                    ? t("Switch to formula editor", "สลับไปแก้ไขสูตร")
                    : t("Preview formula as viewer", "แสดงตัวอย่างสูตร")
                }
              >
                {previewMode ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectNode();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectNode();
                }}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label={t("Select formula block", "เลือกบล็อกสูตร")}
              >
                <SquareDashedMousePointer className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {previewMode ? (
            <div
              className="rounded border border-slate-200 bg-white px-3 py-2 text-slate-900"
              style={{
                fontFamily: "'STIX Two Math', 'Latin Modern Math', serif",
              }}
            >
              {renderResult ? (
                <div
                  className="overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: renderResult }}
                />
              ) : (
                <p className="text-xs text-slate-400">
                  {t("No formula content.", "ยังไม่มีเนื้อหาสูตร")}
                </p>
              )}
            </div>
          ) : (
            <div
              className="space-y-2 rounded border border-slate-300 bg-slate-50 p-2 text-slate-900"
              style={{
                fontFamily: "'STIX Two Math', 'Latin Modern Math', serif",
              }}
            >
              <AiFormulaPanel
                onLatex={persistLatex}
                renderFailed={Boolean(latexInput.trim()) && !renderResult}
              />
              <div className="grid grid-cols-8 gap-1">
                {quickTemplates.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => insertTemplate(item.template)}
                    className="rounded border border-slate-300 bg-white px-1 py-1 text-[11px] leading-none hover:bg-slate-100"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={latexInput}
                onChange={(event) => persistLatex(event.target.value)}
                onFocus={() => {
                  setActiveFormulaBlock(blockId);
                  setActiveToolbarBlockId(blockId);
                }}
                rows={4}
                spellCheck={false}
                placeholder={t(
                  "Type LaTeX directly, e.g. \\frac{a}{b} + \\sqrt{x}",
                  "พิมพ์ LaTeX ได้เลย เช่น \\frac{a}{b} + \\sqrt{x}",
                )}
                className="w-full resize-y rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-mono outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
              />

              <div className="min-h-14 rounded border border-slate-300 bg-white px-3 py-2">
                {renderResult ? (
                  <div
                    className="overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: renderResult }}
                  />
                ) : (
                  <p className="text-xs text-slate-400">
                    {t(
                      "Start typing LaTeX to see the rendered formula.",
                      "เริ่มพิมพ์ LaTeX เพื่อดูผลลัพธ์สูตร",
                    )}
                  </p>
                )}
              </div>

              <p className="text-[10px] text-slate-500">
                {t(
                  "Tip: select text then use left toolbar wrap actions like ",
                  "เคล็ดลับ: เลือกข้อความแล้วใช้คำสั่งห่อจากแถบซ้าย เช่น ",
                )}
                <code>/</code>, <code>^</code>, and <code>(x)</code>.
              </p>
            </div>
          )}
        </>
      ) : (
        <div
          className="text-slate-900"
          style={{ fontFamily: "'STIX Two Math', 'Latin Modern Math', serif" }}
        >
          {renderResult ? (
            <div
              className="overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: renderResult }}
            />
          ) : null}
        </div>
      )}
    </NodeViewWrapper>
  );
}
