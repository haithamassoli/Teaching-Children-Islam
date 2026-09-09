import { expect, test } from "vitest";
import { nextPlayback, numberInRange } from "./quran";

test("accepts only Quran references inside their valid range", () => {
  expect(numberInRange("112", 1, 114)).toBe(112);
  expect(numberInRange("0", 1, 114)).toBe(1);
  expect(numberInRange("115", 1, 114)).toBe(1);
  expect(numberInRange("not-a-number", 1, 114)).toBe(1);
});

test("repeats each verse before continuing through the chapter", () => {
  expect(nextPlayback(2, 1, 3, 7, true)).toEqual({ verseIndex: 2, pass: 2 });
  expect(nextPlayback(2, 3, 3, 7, true)).toEqual({ verseIndex: 3, pass: 1 });
  expect(nextPlayback(6, 3, 3, 7, true)).toBeNull();
  expect(nextPlayback(2, 3, 3, 7, false)).toBeNull();
});
