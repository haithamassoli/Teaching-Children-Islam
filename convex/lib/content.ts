import catalog from "../../content/lessons.json";
import memoryCatalog from "../../content/memorization.json";

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
  prerequisites: string[];
  segments: { id: string; text: string; audio_asset: string | null; image_asset: string | null }[];
  age_instructions: Record<string, string>;
  questions: ContentQuestion[];
  practice: { id: string; instruction: string }[];
  memorization_ids: string[];
};

const requiredReviews = ["text", "religious_content", "age_suitability", "audio", "images"];

export const worlds = catalog.worlds;
export const lessons = catalog.lessons.filter((lesson) => {
  const record = lesson as unknown as Record<string, unknown>;
  const reviews = record.review_status as Record<string, unknown> | undefined;
  return (
    record.status === "approved" &&
    record.publishable === true &&
    typeof record.approved_by === "string" &&
    typeof record.approved_at === "string" &&
    reviews !== undefined &&
    requiredReviews.every((key) => reviews[key] === "approved")
  );
}) as unknown as ContentLesson[];

export const memoryItems = memoryCatalog.items.filter((item) => {
  const record = item as unknown as Record<string, unknown>;
  const reviews = record.review_status as Record<string, unknown> | undefined;
  return (
    record.status === "approved" &&
    record.publishable === true &&
    typeof record.approved_by === "string" &&
    typeof record.approved_at === "string" &&
    reviews !== undefined &&
    requiredReviews.every((key) => reviews[key] === "approved")
  );
}) as {
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
  return JSON.stringify(canonical(answer)) === JSON.stringify(canonical(question.answer));
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
