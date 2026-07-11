import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "prosemirror-state";

/** Matches manual prefixes like "1. " or "12." at the start of a section title. */
export const LEADING_SECTION_NUMBER = /^\d+\.\s*/;

export function stripLeadingSectionNumber(text: string): string {
  return text.replace(LEADING_SECTION_NUMBER, "");
}

interface HeadingFix {
  from: number;
  to: number;
  text: string;
}

export function collectSectionHeadingFixes(doc: PMNode): HeadingFix[] {
  const fixes: HeadingFix[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "heading" || node.attrs.level !== 2) return;
    const raw = node.textContent;
    const stripped = stripLeadingSectionNumber(raw);
    if (!stripped || stripped === raw) return;
    fixes.push({
      from: pos + 1,
      to: pos + node.nodeSize - 1,
      text: stripped,
    });
  });
  return fixes;
}

const numberedSectionHeadingsKey = new PluginKey("numberedSectionHeadings");

export const NumberedSectionHeadingsExtension = Extension.create({
  name: "numberedSectionHeadings",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: numberedSectionHeadingsKey,
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const fixes = collectSectionHeadingFixes(newState.doc);
          if (fixes.length === 0) return null;

          let tr = newState.tr;
          fixes
            .sort((a, b) => b.from - a.from)
            .forEach(({ from, to, text }) => {
              tr = tr.replaceWith(from, to, newState.schema.text(text));
            });
          tr.setMeta(numberedSectionHeadingsKey, true);
          return tr;
        },
      }),
    ];
  },
});
