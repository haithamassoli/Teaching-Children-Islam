/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/!(*.*.*)*.*s");

async function household() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const one = await ctx.db.insert("users", { email: "one@example.test" });
    const two = await ctx.db.insert("users", { email: "two@example.test" });
    return { one, two };
  });
  return {
    t,
    ids,
    one: t.withIdentity({ subject: `${ids.one}|session-one` }),
    two: t.withIdentity({ subject: `${ids.two}|session-two` }),
  };
}

describe("household authorization", () => {
  test("public PIN setup hashes both PIN and parent token", async () => {
    const { t, one } = await household();
    const token = await one.action(api.parent.setPin, { pin: "1234" });
    const stored = await t.run(async (ctx) => ({
      household: await ctx.db.query("households").first(),
      session: await ctx.db.query("parentSessions").first(),
    }));
    expect(stored.household?.pinHash).not.toBe("1234");
    expect(stored.session?.tokenHash).not.toBe(token);
  });

  test("PIN attempts lock after five failures", async () => {
    const { t, ids } = await household();
    await t.run((ctx) =>
      ctx.db.insert("households", {
        userId: ids.one,
        pinHash: "hash",
        pinSalt: "salt",
        pinIterations: 1,
        pinFailures: 0,
      }),
    );
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await t.mutation(internal.parent.reservePinAttempt, { userId: ids.one });
    }
    await expect(
      t.mutation(internal.parent.reservePinAttempt, { userId: ids.one }),
    ).rejects.toThrow("PIN_LOCKED");
  });

  test("children are isolated by authenticated household", async () => {
    const { t, ids, one, two } = await household();
    await t.run((ctx) =>
      ctx.db.insert("children", {
        householdId: ids.one,
        name: "Child one",
        age: 7,
        gender: "male",
        updatedAt: Date.now(),
      }),
    );
    expect(await one.query(api.children.list)).toHaveLength(1);
    expect(await two.query(api.children.list)).toEqual([]);
  });

  test("parent tokens expire and cannot cross auth sessions", async () => {
    const { t, ids, one } = await household();
    await t.run((ctx) =>
      ctx.db.insert("parentSessions", {
        userId: ids.one,
        tokenHash: "token",
        authSubject: `${ids.one}|session-one`,
        expiresAt: Date.now() - 1,
      }),
    );
    const child = { name: "Child", age: 7, gender: "female" as const };
    await expect(
      one.mutation(internal.children.createInternal, {
        ...child,
        userId: ids.one,
        tokenHash: "token",
        authSubject: `${ids.one}|session-one`,
      }),
    ).rejects.toThrow("PARENT_AUTH_REQUIRED");

    await t.run(async (ctx) => {
      const old = await ctx.db.query("parentSessions").first();
      if (old) {
        await ctx.db.delete(old._id);
      }
      await ctx.db.insert("parentSessions", {
        userId: ids.one,
        tokenHash: "token",
        authSubject: `${ids.one}|other-session`,
        expiresAt: Date.now() + 60_000,
      });
    });
    await expect(
      one.mutation(internal.children.createInternal, {
        ...child,
        userId: ids.one,
        tokenHash: "token",
        authSubject: `${ids.one}|session-one`,
      }),
    ).rejects.toThrow("PARENT_AUTH_REQUIRED");
  });

  test("an unlock reserved before a PIN reset cannot create a session", async () => {
    const { t, ids } = await household();
    await t.run((ctx) =>
      ctx.db.insert("households", {
        userId: ids.one,
        pinHash: "new-hash",
        pinSalt: "salt",
        pinIterations: 1,
        pinFailures: 0,
      }),
    );
    await expect(
      t.mutation(internal.parent.finishUnlock, {
        userId: ids.one,
        tokenHash: "token",
        authSubject: `${ids.one}|session-one`,
        expectedPinHash: "old-hash",
      }),
    ).rejects.toThrow("PIN_CHANGED");
  });

  test("deleting a child cascades records and storage", async () => {
    const { t, ids, one } = await household();
    const seeded = await t.run(async (ctx) => {
      const childId = await ctx.db.insert("children", {
        householdId: ids.one,
        name: "Child",
        age: 7,
        gender: "male",
        updatedAt: Date.now(),
      });
      const storageId = await ctx.storage.store(new Blob(["voice"], { type: "audio/webm" }));
      await ctx.db.insert("recordings", {
        householdId: ids.one,
        childId,
        itemId: "item",
        storageId,
        contentType: "audio/webm",
        size: 5,
        status: "pending",
        createdAt: Date.now(),
      });
      await ctx.db.insert("progress", {
        householdId: ids.one,
        childId,
        lessonId: "lesson",
        lessonCompleted: true,
        activityPassed: false,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("parentSessions", {
        userId: ids.one,
        tokenHash: "token",
        authSubject: `${ids.one}|session-one`,
        expiresAt: Date.now() + 60_000,
      });
      return { childId, storageId };
    });
    await one.mutation(internal.children.removeInternal, {
      childId: seeded.childId,
      userId: ids.one,
      tokenHash: "token",
      authSubject: `${ids.one}|session-one`,
    });
    await t.run(async (ctx) => {
      expect(await ctx.db.get(seeded.childId)).toBeNull();
      expect(await ctx.storage.get(seeded.storageId)).toBeNull();
      expect(await ctx.db.query("progress").collect()).toEqual([]);
    });
  });
});
