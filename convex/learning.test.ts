/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const fixtureLessons = [
  {
    id: "lesson-auto",
    world_id: "world",
    order: 1,
    title: "Automatic",
    objective: "Test",
    prerequisites: [],
    segments: [{ id: "segment", text: "Text", audio_asset: null, image_asset: null }],
    age_instructions: {},
    questions: [
      {
        id: "question",
        type: "multiple_choice",
        prompt: "Pick",
        answer: "yes",
        explanation: "Because",
      },
    ],
    practice: [],
    memorization_ids: [],
  },
  {
    id: "lesson-open",
    world_id: "open-world",
    order: 1,
    title: "Open",
    objective: "Test",
    prerequisites: [],
    segments: [{ id: "open-segment", text: "Text", audio_asset: null, image_asset: null }],
    age_instructions: {},
    questions: [
      {
        id: "open-question",
        type: "short_answer",
        prompt: "Tell",
        answer: "secret",
        explanation: "Review",
      },
    ],
    practice: [],
    memorization_ids: [],
  },
];

vi.mock("./lib/content", async (load) => ({
  ...(await load<typeof import("./lib/content")>()),
  worlds: [
    { id: "world", title: "World" },
    { id: "open-world", title: "Open world" },
  ],
  lessons: fixtureLessons,
  lessonById: (id: string) => fixtureLessons.find((lesson) => lesson.id === id),
}));

const modules = import.meta.glob("./**/!(*.*.*)*.*s");
let setup: Awaited<ReturnType<typeof child>>;

beforeEach(async () => {
  setup = await child();
});

async function child() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "parent@example.test" });
    const childId = await ctx.db.insert("children", {
      householdId: userId,
      name: "Child",
      age: 7,
      gender: "male",
      updatedAt: Date.now(),
    });
    return { userId, childId };
  });
  return { t, ids, asParent: t.withIdentity({ subject: `${ids.userId}|session` }) };
}

test("wrong then retry preserves first attempt and awards only once", async () => {
  const { t, ids, asParent } = setup;
  await expect(
    asParent.mutation(api.learning.submitActivity, {
      childId: ids.childId,
      lessonId: "lesson-auto",
      questionId: "question",
      answer: "no",
    }),
  ).resolves.toMatchObject({ correct: false });
  for (let repeat = 0; repeat < 2; repeat += 1) {
    await asParent.mutation(api.learning.submitActivity, {
      childId: ids.childId,
      lessonId: "lesson-auto",
      questionId: "question",
      answer: "yes",
    });
  }
  await t.run(async (ctx) => {
    const progress = await ctx.db.query("progress").first();
    expect(progress?.firstAttemptCorrect).toBe(false);
    expect(await ctx.db.query("rewards").collect()).toHaveLength(1);
  });
});

test("activity before final segment still earns one world badge", async () => {
  const { t, ids, asParent } = setup;
  await asParent.mutation(api.learning.submitActivity, {
    childId: ids.childId,
    lessonId: "lesson-auto",
    questionId: "question",
    answer: "yes",
  });
  await asParent.mutation(api.learning.completeSegment, {
    childId: ids.childId,
    lessonId: "lesson-auto",
    segmentId: "segment",
  });
  await asParent.mutation(api.learning.completeSegment, {
    childId: ids.childId,
    lessonId: "lesson-auto",
    segmentId: "segment",
  });
  const rewards = await t.run((ctx) => ctx.db.query("rewards").collect());
  expect(rewards.filter((reward) => reward.kind === "world_badge")).toHaveLength(1);
  expect(rewards.reduce((sum, reward) => sum + reward.amount, 0)).toBe(3);
});

test("an open answer cannot earn activity stars", async () => {
  const { t, ids, asParent } = setup;
  await expect(
    asParent.mutation(api.learning.submitActivity, {
      childId: ids.childId,
      lessonId: "lesson-open",
      questionId: "open-question",
      answer: "anything",
    }),
  ).resolves.toMatchObject({ correct: null });
  expect(await t.run((ctx) => ctx.db.query("rewards").collect())).toEqual([]);
});
