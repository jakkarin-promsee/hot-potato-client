// Pure evaluation math for multiple-choice questions, extracted verbatim from
// QuestionChoiceView's handleSubmit so it can be unit-tested without React.
// Semantics must stay identical to the original inline block.

export interface Choice {
  text: string;
  correct: boolean;
}

export interface ChoiceEvaluation {
  accuracyPercent: number;
  evaluationLevel: "correct" | "almost" | "incorrect";
  missedCorrect: string; // " | "-joined
  wrongSelected: string;
  correctAnswer: string;
  userAnswer: string;
}

export function evaluateChoiceAnswer(
  choices: Choice[],
  selectedIndices: number[],
): ChoiceEvaluation {
  const matchedCount = choices.filter(
    (choice, idx) => choice.correct === selectedIndices.includes(idx),
  ).length;

  const accuracyPercent =
    choices.length > 0
      ? Math.round((matchedCount / choices.length) * 100)
      : 0;

  const evaluationLevel: "correct" | "almost" | "incorrect" =
    accuracyPercent === 100
      ? "correct"
      : accuracyPercent >= 60
        ? "almost"
        : "incorrect";

  const missedCorrect = choices
    .map((choice, idx) => ({ choice, idx }))
    .filter(({ choice, idx }) => choice.correct && !selectedIndices.includes(idx))
    .map(({ choice }) => choice.text.trim())
    .filter(Boolean)
    .join(" | ");

  const wrongSelected = selectedIndices
    .filter((idx) => !choices[idx]?.correct)
    .map((idx) => choices[idx]?.text?.trim() ?? "")
    .filter(Boolean)
    .join(" | ");

  const correctAnswer = choices
    .filter((choice) => choice.correct)
    .map((choice) => choice.text.trim())
    .filter(Boolean)
    .join(" | ");

  const userAnswer = selectedIndices
    .map((idx) => choices[idx]?.text?.trim() ?? "")
    .filter(Boolean)
    .join(" | ");

  return {
    accuracyPercent,
    evaluationLevel,
    missedCorrect,
    wrongSelected,
    correctAnswer,
    userAnswer,
  };
}
