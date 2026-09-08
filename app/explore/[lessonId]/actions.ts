"use server";

import { type Answer, grade, lessonById } from "../../../convex/lib/content";

// biome-ignore lint/suspicious/useAwait: Next.js Server Actions must be declared async.
export async function checkAnswer(lessonId: string, questionId: string, answer: Answer) {
  if (
    typeof lessonId !== "string" ||
    typeof questionId !== "string" ||
    JSON.stringify(answer ?? null).length > 8000
  ) {
    throw new Error("INVALID_ANSWER");
  }
  const question = lessonById(lessonId)?.questions.find((item) => item.id === questionId);
  if (!question) {
    throw new Error("QUESTION_NOT_FOUND");
  }
  const valid =
    typeof answer === "string" ||
    (Array.isArray(answer)
      ? answer.every((value) => typeof value === "string")
      : answer !== null &&
        typeof answer === "object" &&
        Object.values(answer).every((value) => typeof value === "string"));
  if (!valid) {
    throw new Error("INVALID_ANSWER");
  }
  const correct = grade(question, answer);
  return {
    correct,
    explanation:
      correct === false
        ? "حاول مرة أخرى، يمكنك الرجوع إلى الدرس والاستعانة به."
        : question.explanation,
  };
}
