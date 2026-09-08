import { describe, expect, it } from "vitest";
import { activities, hadithById, lessonBundle, lessonForPages, lessons } from "./catalog";

describe("lessonBundle", () => {
  it("carries the book material the lesson references", () => {
    const lesson = lessons.find((item) => item.id === "faith-001");
    if (!lesson) {
      throw new Error("faith-001 missing");
    }
    const bundle = lessonBundle(lesson);
    expect(bundle.activities.map((item) => item.id)).toEqual(lesson.original_activity_ids);
    expect(bundle.memory.map((item) => item.id)).toEqual(lesson.memorization_ids);
    expect(bundle.hadiths.length).toBeGreaterThan(0);
    // Answers travel with the activity so the child never leaves the lesson page.
    expect(bundle.activities[0].answer).toBeTruthy();
  });

  it("reaches every activity and every source question from some lesson", () => {
    const shown = new Set(lessons.flatMap((lesson) => lessonBundle(lesson).activities));
    expect(shown.size).toBe(activities.length);
    const orphanQuestions = lessons.every((lesson) => lessonBundle(lesson).questions.length === 0);
    expect(orphanQuestions).toBe(false);
  });

  it("resolves memorised hadiths to a title and a lesson", () => {
    for (const lesson of lessons) {
      for (const item of lessonBundle(lesson).memory) {
        if ("hadith_id" in item && item.hadith_id) {
          expect(hadithById(item.hadith_id)?.title).toBeTruthy();
          expect(lessonForPages(hadithById(item.hadith_id)?.source_pages ?? [])).toBeTruthy();
        }
      }
    }
  });
});
