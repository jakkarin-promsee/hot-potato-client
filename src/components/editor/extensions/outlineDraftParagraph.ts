import Paragraph from "@tiptap/extension-paragraph";

/** Paragraphs inserted by "ร่างโครงบทเรียน" — styled as draft scaffold in the editor only. */
export const OutlineDraftParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      outlineDraft: {
        default: null,
        parseHTML: (el) =>
          el.getAttribute("data-outline-draft") === "true" ? true : null,
        renderHTML: (attrs) =>
          attrs.outlineDraft
            ? { "data-outline-draft": "true", class: "outline-draft" }
            : {},
      },
    };
  },
});
