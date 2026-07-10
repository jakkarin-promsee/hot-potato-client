import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders tutor/AI reply text as a safe subset of markdown.
 * Student text stays plain — never wrap student bubbles with this.
 *
 * Allowlist: paragraphs, bold/italic, short lists, inline code, code blocks,
 * blockquotes, links. No raw HTML, no images, no tables, no headings
 * (headings downgrade to bold paragraphs). Colors inherit from the bubble.
 */

const ALLOWED_ELEMENTS = [
  "p",
  "strong",
  "em",
  "del",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "blockquote",
  "a",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];

function HeadingAsBold({ children }: { children?: React.ReactNode }) {
  return <p className="mb-1 font-semibold last:mb-0">{children}</p>;
}

const components: Components = {
  p: (props: ComponentProps<"p">) => (
    <p className="mb-1.5 whitespace-pre-wrap last:mb-0" {...props} />
  ),
  strong: (props: ComponentProps<"strong">) => (
    <strong className="font-semibold" {...props} />
  ),
  ul: (props: ComponentProps<"ul">) => (
    <ul className="mb-1.5 list-disc space-y-0.5 pl-5 last:mb-0" {...props} />
  ),
  ol: (props: ComponentProps<"ol">) => (
    <ol className="mb-1.5 list-decimal space-y-0.5 pl-5 last:mb-0" {...props} />
  ),
  code: (props: ComponentProps<"code">) => (
    <code
      className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em]"
      {...props}
    />
  ),
  pre: (props: ComponentProps<"pre">) => (
    <pre
      className="mb-1.5 overflow-x-auto rounded-md bg-gray-800 p-2 font-mono text-xs text-gray-100 last:mb-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
      {...props}
    />
  ),
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote
      className="mb-1.5 border-l-2 border-gray-300 pl-2 italic opacity-90 last:mb-0"
      {...props}
    />
  ),
  a: (props: ComponentProps<"a">) => (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline"
      {...props}
    />
  ),
  h1: HeadingAsBold,
  h2: HeadingAsBold,
  h3: HeadingAsBold,
  h4: HeadingAsBold,
  h5: HeadingAsBold,
  h6: HeadingAsBold,
};

interface MarkdownMessageProps {
  text: string;
  className?: string;
}

export default function MarkdownMessage({
  text,
  className,
}: MarkdownMessageProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        skipHtml
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
