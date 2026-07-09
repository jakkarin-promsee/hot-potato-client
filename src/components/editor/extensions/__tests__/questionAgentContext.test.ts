import { describe, it, expect } from "vitest";
import { buildQuestionAgentUserContext } from "../questionAgentContext";

describe("buildQuestionAgentUserContext", () => {
  it("puts the current block's history first", () => {
    const ctx = buildQuestionAgentUserContext(
      {
        other: {
          chatHistory: [
            { question: "Other Q", answer: "Other A", createdAt: "2026-01-01" },
          ],
        },
      },
      "current",
      [{ question: "My Q", answer: "My A", createdAt: "2026-01-02" }],
    );
    expect(ctx.indexOf("Block current:")).toBeLessThan(
      ctx.indexOf("Block other:"),
    );
    expect(ctx).toContain("My Q");
    expect(ctx).toContain("A1: My A");
  });

  it("skips entries missing question or answer", () => {
    const ctx = buildQuestionAgentUserContext(
      {},
      "b1",
      [
        { question: "", answer: "A" },
        { question: "Q", answer: "" },
        { question: "Good Q", answer: "Good A" },
      ],
    );
    expect(ctx).toContain("Good Q");
    expect(ctx).toContain("Good A");
    expect(ctx.split("\n").filter((l) => l.startsWith("Q")).length).toBe(1);
  });

  it("keeps the tail when result exceeds 8000 chars", () => {
    const longAnswer = "x".repeat(5000);
    const ctx = buildQuestionAgentUserContext(
      {},
      "b1",
      [
        { question: "Old question", answer: longAnswer },
        { question: "Recent question", answer: "recent answer" },
      ],
    );
    expect(ctx.length).toBeLessThanOrEqual(8000);
    expect(ctx).toContain("Recent question");
    expect(ctx).toContain("recent answer");
    // The older block should have been truncated from the head
    expect(ctx.startsWith("Block b1:")).toBe(true);
  });

  it("appends other blocks as 'Block <id>:' sections", () => {
    const ctx = buildQuestionAgentUserContext(
      {
        blockA: {
          chatHistory: [
            { question: "Q in A", answer: "A in A" },
          ],
        },
      },
      "current",
      [],
    );
    expect(ctx).toContain("Block blockA:");
    expect(ctx).toContain("Q in A");
  });
});
