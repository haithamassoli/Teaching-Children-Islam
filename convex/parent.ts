import { getAuthUserId, retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";
import { hashPin, randomHex, sha256, validPin } from "./lib/crypto";

const PIN_ITERATIONS = 310_000;
const PARENT_SESSION_MS = 15 * 60 * 1000;
const PIN_LOCK_MS = 15 * 60 * 1000;

export const status = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("UNAUTHENTICATED");
    }
    const household = await ctx.db
      .query("households")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return { hasPin: Boolean(household?.pinHash) };
  },
});

export const setPin = action({
  args: { pin: v.string() },
  handler: async (ctx, { pin }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("UNAUTHENTICATED");
    }
    const authSubject = (await ctx.auth.getUserIdentity())?.subject;
    if (!authSubject) {
      throw new Error("UNAUTHENTICATED");
    }
    if (!validPin(pin)) {
      throw new Error("INVALID_PIN");
    }
    const salt = randomHex(16);
    const pinHash = await hashPin(pin, salt, PIN_ITERATIONS);
    const token = randomHex();
    await ctx.runMutation(internal.parent.storeInitialPin, {
      userId,
      pinHash,
      pinSalt: salt,
      pinIterations: PIN_ITERATIONS,
      tokenHash: await sha256(token),
      authSubject,
    });
    return token;
  },
});

export const unlock = action({
  args: { pin: v.string() },
  handler: async (ctx, { pin }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("UNAUTHENTICATED");
    }
    const authSubject = (await ctx.auth.getUserIdentity())?.subject;
    if (!authSubject) {
      throw new Error("UNAUTHENTICATED");
    }
    if (!validPin(pin)) {
      throw new Error("INVALID_PIN");
    }
    const attempt = await ctx.runMutation(internal.parent.reservePinAttempt, { userId });
    const matches =
      (await hashPin(pin, attempt.pinSalt, attempt.pinIterations)) === attempt.pinHash;
    if (!matches) {
      throw new Error("INVALID_PIN");
    }
    const token = randomHex();
    await ctx.runMutation(internal.parent.finishUnlock, {
      userId,
      tokenHash: await sha256(token),
      authSubject,
      expectedPinHash: attempt.pinHash,
    });
    return token;
  },
});

export const resetPinWithPassword = action({
  args: { password: v.string(), pin: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("UNAUTHENTICATED");
    }
    const authSubject = (await ctx.auth.getUserIdentity())?.subject;
    if (!authSubject) {
      throw new Error("UNAUTHENTICATED");
    }
    if (!validPin(args.pin)) {
      throw new Error("INVALID_PIN");
    }
    const account = await ctx.runQuery(internal.parent.currentAccount, { userId });
    if (!account?.email) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }
    const verified = await retrieveAccount(ctx, {
      provider: "password",
      account: { id: account.email, secret: args.password },
    });
    if (verified.user._id !== userId) {
      throw new Error("INVALID_CREDENTIALS");
    }
    const salt = randomHex(16);
    const token = randomHex();
    await ctx.runMutation(internal.parent.replacePin, {
      userId,
      pinHash: await hashPin(args.pin, salt, PIN_ITERATIONS),
      pinSalt: salt,
      pinIterations: PIN_ITERATIONS,
      tokenHash: await sha256(token),
      authSubject,
    });
    return token;
  },
});

export const lock = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("UNAUTHENTICATED");
    }
    for (const session of await ctx.db
      .query("parentSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()) {
      await ctx.db.delete(session._id);
    }
  },
});

export const deleteAccount = action({
  args: { parentToken: v.string() },
  handler: async (ctx, { parentToken }): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = await getAuthUserId(ctx);
    if (!identity || !userId) {
      throw new Error("UNAUTHENTICATED");
    }
    return ctx.runMutation(internal.parent.deleteAccountInternal, {
      userId,
      authSubject: identity.subject,
      tokenHash: await sha256(parentToken),
    });
  },
});

export const deleteAccountInternal = internalMutation({
  args: { userId: v.id("users"), authSubject: v.string(), tokenHash: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("parentSessions")
      .withIndex("by_token", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    if (
      !session ||
      session.userId !== args.userId ||
      session.authSubject !== args.authSubject ||
      session.expiresAt <= Date.now()
    ) {
      throw new Error("PARENT_AUTH_REQUIRED");
    }

    // ponytail: single-transaction cascade; batch it before one household can exceed Convex transaction limits.
    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_household", (q) => q.eq("householdId", args.userId))
      .collect();
    for (const recording of recordings) {
      await ctx.storage.delete(recording.storageId);
    }
    for (const table of [
      "progress",
      "segmentProgress",
      "activityAttempts",
      "rewards",
      "recordings",
      "reviews",
    ] as const) {
      const records = await ctx.db
        .query(table)
        .withIndex("by_household", (q) => q.eq("householdId", args.userId))
        .collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
    }
    for (const child of await ctx.db
      .query("children")
      .withIndex("by_household", (q) => q.eq("householdId", args.userId))
      .collect()) {
      await ctx.db.delete(child._id);
    }
    for (const parentSession of await ctx.db
      .query("parentSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()) {
      await ctx.db.delete(parentSession._id);
    }
    const household = await ctx.db
      .query("households")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (household) {
      await ctx.db.delete(household._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    for (const account of accounts) {
      for (const code of await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect()) {
        await ctx.db.delete(code._id);
      }
      await ctx.db.delete(account._id);
    }
    const authSessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const authSession of authSessions) {
      for (const token of await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", authSession._id))
        .collect()) {
        await ctx.db.delete(token._id);
      }
      await ctx.db.delete(authSession._id);
    }
    await ctx.db.delete(args.userId);
  },
});

export const storeInitialPin = internalMutation({
  args: {
    userId: v.id("users"),
    pinHash: v.string(),
    pinSalt: v.string(),
    pinIterations: v.number(),
    tokenHash: v.string(),
    authSubject: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await ctx.db.get(args.userId))) {
      throw new Error("UNAUTHENTICATED");
    }
    const existing = await ctx.db
      .query("households")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing?.pinHash) {
      throw new Error("PIN_ALREADY_SET");
    }
    const pin = {
      pinHash: args.pinHash,
      pinSalt: args.pinSalt,
      pinIterations: args.pinIterations,
      pinFailures: 0,
    };
    if (existing) {
      await ctx.db.patch(existing._id, pin);
    } else {
      await ctx.db.insert("households", { userId: args.userId, ...pin });
    }
    await createSession(ctx, args.userId, args.tokenHash, args.authSubject);
  },
});

export const reservePinAttempt = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const household = await ctx.db
      .query("households")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!household?.pinHash || !household.pinSalt || !household.pinIterations) {
      throw new Error("PIN_NOT_SET");
    }
    const now = Date.now();
    if (household.pinLockedUntil && household.pinLockedUntil > now) {
      throw new Error("PIN_LOCKED");
    }
    const failures = (household.pinLockedUntil ? 0 : household.pinFailures) + 1;
    await ctx.db.patch(household._id, {
      pinFailures: failures >= 5 ? 0 : failures,
      pinLockedUntil: failures >= 5 ? now + PIN_LOCK_MS : undefined,
    });
    return {
      pinHash: household.pinHash,
      pinSalt: household.pinSalt,
      pinIterations: household.pinIterations,
    };
  },
});

export const finishUnlock = internalMutation({
  args: {
    userId: v.id("users"),
    tokenHash: v.string(),
    authSubject: v.string(),
    expectedPinHash: v.string(),
  },
  handler: async (ctx, { userId, tokenHash, authSubject, expectedPinHash }) => {
    const household = await ctx.db
      .query("households")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!household) {
      throw new Error("PIN_NOT_SET");
    }
    if (household.pinHash !== expectedPinHash) {
      throw new Error("PIN_CHANGED");
    }
    await ctx.db.patch(household._id, { pinFailures: 0, pinLockedUntil: undefined });
    await createSession(ctx, userId, tokenHash, authSubject);
  },
});

export const currentAccount = internalQuery({
  args: { userId: v.id("users") },
  handler: (ctx, { userId }) => ctx.db.get(userId),
});

export const replacePin = internalMutation({
  args: {
    userId: v.id("users"),
    pinHash: v.string(),
    pinSalt: v.string(),
    pinIterations: v.number(),
    tokenHash: v.string(),
    authSubject: v.string(),
  },
  handler: async (ctx, args) => {
    const household = await ctx.db
      .query("households")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!household) {
      throw new Error("PIN_NOT_SET");
    }
    await ctx.db.patch(household._id, {
      pinHash: args.pinHash,
      pinSalt: args.pinSalt,
      pinIterations: args.pinIterations,
      pinFailures: 0,
      pinLockedUntil: undefined,
    });
    for (const session of await ctx.db
      .query("parentSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()) {
      await ctx.db.delete(session._id);
    }
    await createSession(ctx, args.userId, args.tokenHash, args.authSubject);
  },
});

async function createSession(
  ctx: MutationCtx,
  userId: Id<"users">,
  tokenHash: string,
  authSubject: string,
) {
  await ctx.db.insert("parentSessions", {
    userId,
    tokenHash,
    authSubject,
    expiresAt: Date.now() + PARENT_SESSION_MS,
  });
}
