/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, expect, test, vi } from "vitest";
import { encodeWav } from "../lib/wav";
import schema from "./schema";

vi.mock("./lib/content", async (load) => ({
  ...(await load<typeof import("./lib/content")>()),
  lessons: [],
  practiceItems: [],
  memoryItems: [{ id: "memory", title: "Memory", recitation_asset: null }],
}));

const modules = import.meta.glob("./**/!(*.*.*)*.*s");
let setup: Awaited<ReturnType<typeof family>>;

beforeEach(async () => {
  setup = await family();
});

async function family() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "parent@example.test" });
    const childId = await ctx.db.insert("children", {
      householdId: userId,
      name: "Child",
      age: 7,
      gender: "male",
      recordingConsentAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { userId, childId };
  });
  return { t, ids, asParent: t.withIdentity({ subject: `${ids.userId}|session` }) };
}

test("authenticated WAV upload derives duration and remains private", async () => {
  const { t, ids, asParent } = setup;
  const wav = encodeWav(new Float32Array(16_000));
  const response = await asParent.fetch(`/recordings?childId=${ids.childId}&itemId=memory`, {
    method: "POST",
    headers: { "Content-Type": "audio/wav" },
    body: wav,
  });
  expect(response.status).toBe(200);
  const recording = await t.run((ctx) => ctx.db.query("recordings").first());
  expect(recording).toMatchObject({ durationMs: 1000, contentType: "audio/wav" });
});

test("invalid replacement leaves the previous recording intact", async () => {
  const { t, ids, asParent } = setup;
  const url = `/recordings?childId=${ids.childId}&itemId=memory`;
  expect(
    (
      await asParent.fetch(url, {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: encodeWav(new Float32Array(16_000)),
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await asParent.fetch(url, {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: new Uint8Array([1, 2, 3]),
      })
    ).status,
  ).toBe(400);
  expect(await t.run((ctx) => ctx.db.query("recordings").collect())).toHaveLength(1);
});
