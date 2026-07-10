/**
 * Reading-position helper for the Ask-AI modal.
 *
 * The server owns lesson context now (`server/src/services/lessonContext.service.ts`);
 * the client only sends a light "where the student is reading" hint via the
 * tutor request's `currentSection` field. The legacy lesson/user-context
 * serializers were removed in Tier 0.A along with the `/chat/ask` endpoint.
 */
export function getQuestionAgentViewportContext(
  container: HTMLElement,
): string {
  // Clamp to the visual viewport: the container can be as tall as the whole
  // lesson (the window is the scroller in the viewer), so intersecting with
  // the raw container rect would match every node from the top.
  const containerRect = container.getBoundingClientRect();
  const visibleTop = Math.max(containerRect.top, 0);
  const visibleBottom = Math.min(containerRect.bottom, window.innerHeight);
  const nodes = Array.from(
    container.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, [data-type]",
    ),
  ) as HTMLElement[];

  const lines: string[] = [];
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    const intersects = rect.bottom >= visibleTop && rect.top <= visibleBottom;
    if (!intersects) continue;
    const text = node.textContent?.trim();
    if (!text) continue;
    lines.push(text);
    if (lines.join("\n").length > 2400) break;
  }

  return lines.join("\n").trim();
}
