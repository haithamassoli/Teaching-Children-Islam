import { lessons as reviewedLessons, memoryItems as reviewedMemory } from "../../lib/catalog";

export { bookPageText, worlds } from "../../lib/catalog";

export type Answer = string | string[] | Record<string, string>;
export type ContentQuestion = {
  id: string;
  type: string;
  prompt: string | string[];
  answer: unknown;
  explanation: string;
  grading?: string;
  age_instructions?: Record<string, string>;
  options?: unknown;
  items?: unknown;
  left?: unknown;
  right?: unknown;
};
export type ContentLesson = {
  id: string;
  world_id: string;
  order: number;
  title: string;
  objective: string;
  source_pages: number[];
  prerequisites: string[];
  segments: {
    id: string;
    text: string;
    origin: string;
    audio_asset: string | null;
    image_asset: string | null;
  }[];
  age_instructions: Record<string, string>;
  questions: ContentQuestion[];
  practice: { id: string; instruction: string }[];
  memorization_ids: string[];
};

export const lessons = reviewedLessons as unknown as ContentLesson[];

export const memoryItems = reviewedMemory.map((item) => ({
  ...item,
  text: "names" in item ? item.names?.join(" · ") : undefined,
})) as {
  id: string;
  title: string;
  text?: string;
  recitation_asset: string | null;
}[];

export const practiceItems = lessons.flatMap((lesson) => lesson.practice);

export function lessonById(id: string) {
  return lessons.find((lesson) => lesson.id === id);
}

export function isAutomatic(question: ContentQuestion) {
  return !["short_answer", "parent_discussion"].includes(question.type);
}

export function isStageComplete(
  content: Pick<ContentLesson, "questions"> | undefined,
  state: { lessonCompleted: boolean; activityPassed: boolean },
) {
  // Discussion-only lessons can advance after reading; they never earn automatic activity stars.
  return Boolean(
    content &&
      state.lessonCompleted &&
      (state.activityPassed || !content.questions.some(isAutomatic)),
  );
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function canonical(value: unknown): unknown {
  if (typeof value === "string") {
    return clean(value);
  }
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

export function grade(question: ContentQuestion, answer: Answer): boolean | null {
  if (!isAutomatic(question)) {
    return null;
  }
  if (question.type === "numeric") {
    if (typeof answer !== "string") {
      return false;
    }
    const digits = answer
      .trim()
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace("٫", ".");
    if (!/^-?\d+(?:\.\d+)?$/.test(digits)) {
      return false;
    }
    const expected = question.answer as number | { value?: number; accepted?: number[] };
    const accepted =
      typeof expected === "number" ? [expected] : [expected.value, ...(expected.accepted ?? [])];
    return accepted.includes(Number(digits));
  }
  if (question.type === "multiple_select") {
    if (!Array.isArray(answer) || !Array.isArray(question.answer)) {
      return false;
    }
    return (
      JSON.stringify(answer.map(clean).sort()) ===
      JSON.stringify(question.answer.map(String).map(clean).sort())
    );
  }
  let candidate: unknown = answer;
  if (
    ["matching", "source_reference_match"].includes(question.type) &&
    typeof answer === "string"
  ) {
    // Convex object keys must be ASCII; matching labels can be Arabic.
    try {
      candidate = JSON.parse(answer);
    } catch {
      return false;
    }
  }
  return JSON.stringify(canonical(candidate)) === JSON.stringify(canonical(question.answer));
}

export function publicQuestion(question: ContentQuestion) {
  return {
    id: question.id,
    type: question.type,
    prompt: Array.isArray(question.prompt) ? question.prompt.join("\n") : question.prompt,
    ageInstructions: question.age_instructions,
    options: question.options,
    items: question.items,
    left: question.left,
    right: question.right,
  };
}
