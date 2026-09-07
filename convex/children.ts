import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, action, internalMutation, mutation, query } from "./_generated/server";
import { requireHousehold, requireOwnedChild, requireParentSession } from "./lib/authz";
import { sha256 } from "./lib/crypto";

const gender = v.union(v.literal("male"), v.literal("female"));

async function credentials(ctx: ActionCtx, parentToken: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("UNAUTHENTICATED");
  }
  return {
    userId: await requireHousehold(ctx),
    tokenHash: await sha256(parentToken),
    authSubject: identity.subject,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const householdId = await requireHousehold(ctx);
    return ctx.db
      .query("children")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();
  },
});

export const create = action({
  args: { name: v.string(), age: v.number(), gender, parentToken: v.string() },
  handler: async (ctx, { parentToken, ...child }): Promise<Id<"children">> =>
    ctx.runMutation(internal.children.createInternal, {
      ...child,
      ...(await credentials(ctx, parentToken)),
    }),
});

export const update = action({
  args: {
    childId: v.id("children"),
    name: v.string(),
    age: v.number(),
    gender,
    parentToken: v.string(),
  },
  handler: async (ctx, { parentToken, ...child }): Promise<null> =>
    ctx.runMutation(internal.children.updateInternal, {
      ...child,
      ...(await credentials(ctx, parentToken)),
    }),
});

export const remove = action({
  args: { childId: v.id("children"), parentToken: v.string() },
  handler: async (ctx, args): Promise<null> =>
    ctx.runMutation(internal.children.removeInternal, {
      childId: args.childId,
      ...(await credentials(ctx, args.parentToken)),
    }),
});

const parentArgs = { userId: v.id("users"), tokenHash: v.string(), authSubject: v.string() };

export const createInternal = internalMutation({
  args: { name: v.string(), age: v.number(), gender, ...parentArgs },
  handler: async (ctx, args) => {
    await requireParentSession(ctx, args.userId, args.tokenHash, args.authSubject);
    const name = args.name.trim();
    if (!name || name.length > 40 || !Number.isInteger(args.age) || args.age < 6 || args.age > 10) {
      throw new Error("INVALID_CHILD");
    }
    return ctx.db.insert("children", {
      householdId: args.userId,
      name,
      age: args.age,
      gender: args.gender,
      updatedAt: Date.now(),
    });
  },
});

export const updateInternal = internalMutation({
  args: { childId: v.id("children"), name: v.string(), age: v.number(), gender, ...parentArgs },
  handler: async (ctx, args) => {
    await requireParentSession(ctx, args.userId, args.tokenHash, args.authSubject);
    await requireOwnedChild(ctx, args.childId);
    const name = args.name.trim();
    if (!name || name.length > 40 || !Number.isInteger(args.age) || args.age < 6 || args.age > 10) {
      throw new Error("INVALID_CHILD");
    }
    await ctx.db.patch(args.childId, {
      name,
      age: args.age,
      gender: args.gender,
      updatedAt: Date.now(),
    });
  },
});

export const selectCharacter = mutation({
  args: { childId: v.id("children"), characterId: v.string() },
  handler: async (ctx, args) => {
    await requireOwnedChild(ctx, args.childId);
    if (!/^[a-z0-9-]{1,32}$/.test(args.characterId)) {
      throw new Error("INVALID_CHARACTER");
    }
    await ctx.db.patch(args.childId, { characterId: args.characterId, updatedAt: Date.now() });
  },
});

export const removeInternal = internalMutation({
  args: { childId: v.id("children"), ...parentArgs },
  handler: async (ctx, args) => {
    await requireParentSession(ctx, args.userId, args.tokenHash, args.authSubject);
    await requireOwnedChild(ctx, args.childId);
    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .collect();
    for (const recording of recordings) {
      await ctx.storage.delete(recording.storageId);
      await ctx.db.delete(recording._id);
    }
    for (const table of [
      "progress",
      "segmentProgress",
      "activityAttempts",
      "rewards",
      "reviews",
    ] as const) {
      const records = await ctx.db
        .query(table)
        .withIndex("by_child", (q) => q.eq("childId", args.childId))
        .collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
    }
    await ctx.db.delete(args.childId);
  },
});
