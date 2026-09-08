import { describe, expect, test } from "vitest";
import { type ContentQuestion, grade, lessons } from "./lib/content";

const question = (type: string, answer: unknown): ContentQuestion => ({
  id: "q",
  type,
  prompt: "prompt",
  answer,
  explanation: "explanation",
});

describe("server-side activity grading", () => {
  test("structured answers are graded without trusting a client correctness flag", () => {
    expect(grade(question("ordering", ["one", "two"]), ["one", "two"])).toBe(true);
    expect(grade(question("ordering", ["one", "two"]), ["two", "one"])).toBe(false);
    expect(grade(question("multiple_select", ["one", "two"]), ["two", "one"])).toBe(true);
    expect(grade(question("matching", { a: "b" }), { a: "b" })).toBe(true);
  });

  test("open answers require parent review", () => {
    expect(grade(question("short_answer", "secret answer"), "anything")).toBeNull();
    expect(grade(question("parent_discussion", "secret answer"), "anything")).toBeNull();
  });

  test("numeric grading rejects text instead of coercing it to zero", () => {
    expect(grade(question("numeric", { value: 0 }), "abc")).toBe(false);
    expect(grade(question("numeric", { value: 12 }), "١٢")).toBe(true);
  });

  test("draft lessons never enter the runtime catalog", () => {
    expect(lessons).toEqual([]);
  });
});
