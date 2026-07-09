import { describe, it, expect } from "vitest";
import { evaluateChoiceAnswer } from "../questionEvaluation";

const fourChoices = [
  { text: "A", correct: true },
  { text: "B", correct: true },
  { text: "C", correct: false },
  { text: "D", correct: false },
];

describe("evaluateChoiceAnswer", () => {
  it("all correct selections → 100 / correct", () => {
    const r = evaluateChoiceAnswer(fourChoices, [0, 1]);
    expect(r.accuracyPercent).toBe(100);
    expect(r.evaluationLevel).toBe("correct");
  });

  it("59% → incorrect (below the 60 almost threshold)", () => {
    // 17 choices (10 correct, 7 incorrect). Select 4 correct + 1 wrong:
    // matched = 4 selected-correct + 6 unselected-incorrect = 10/17 → round(58.82) = 59%
    const seventeen = [
      ...Array.from({ length: 10 }, (_, i) => ({ text: `C${i}`, correct: true })),
      ...Array.from({ length: 7 }, (_, i) => ({ text: `W${i}`, correct: false })),
    ];
    const r = evaluateChoiceAnswer(seventeen, [0, 1, 2, 3, 10]);
    expect(r.accuracyPercent).toBe(59);
    expect(r.evaluationLevel).toBe("incorrect");
  });

  it("60% boundary → almost", () => {
    const five = [
      { text: "1", correct: true },
      { text: "2", correct: true },
      { text: "3", correct: true },
      { text: "4", correct: false },
      { text: "5", correct: false },
    ];
    const r = evaluateChoiceAnswer(five, [0, 1, 3]);
    expect(r.accuracyPercent).toBe(60);
    expect(r.evaluationLevel).toBe("almost");
  });

  it("empty choices → 0 / incorrect", () => {
    const r = evaluateChoiceAnswer([], []);
    expect(r.accuracyPercent).toBe(0);
    expect(r.evaluationLevel).toBe("incorrect");
  });

  it("missed/wrong strings join with ' | ' and skip empty texts", () => {
    const choices = [
      { text: "  Alpha  ", correct: true },
      { text: "", correct: true },
      { text: "Wrong", correct: false },
    ];
    const r = evaluateChoiceAnswer(choices, [2]); // picked Wrong, missed Alpha
    expect(r.missedCorrect).toBe("Alpha");
    expect(r.wrongSelected).toBe("Wrong");
    expect(r.correctAnswer).toBe("Alpha");
    expect(r.userAnswer).toBe("Wrong");
  });
});
