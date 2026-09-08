import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type ActionCtx,
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";
import { requireHousehold, requireOwnedChild, requireParentSession } from "./lib/authz";
import { lessons, memoryItems, practiceItems } from "./lib/content";
import { sha256 } from "./lib/crypto";

async function parentCredentials(ctx: ActionCtx, parentToken: string) {
  const identity = await ctx.auth.getUserIdentity();
  const userId = await getAuthUserId(ctx);
  if (!identity || !userId) {
    throw new Error("UNAUTHENTICATED");
  }
  return { userId, authSubject: identity.subject, tokenHash: await sha256(parentToken) };
}

export const items = query({
  args: { childId: v.id("children") },
  handler: async (ctx, { childId }) => {
    const child = await requireOwnedChild(ctx, childId);
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();
    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();
    return {
      memorization: memoryItems.map((item) => {
        const review = reviews.find(
          (entry) => entry.itemId === item.id && entry.kind === "memorization",
        );
        return {
          id: item.id,
          title: item.title,
          text: item.text,
          audioAsset: item.recitation_asset,
          status: review?.status === "training" ? "practicing" : (review?.status ?? "not_started"),
          recordingId: recordings.find((entry) => entry.itemId === item.id)?._id,
        };
      }),
      practice: practiceItems.map((item) => {
        const review = reviews.find(
          (entry) => entry.itemId === item.id && entry.kind === "practice",
        );
        return {
          id: item.id,
          instruction: item.instruction,
          status: review?.status === "training" ? "practicing" : (review?.status ?? "not_started"),
        };
      }),
      consent: Boolean(child.recordingConsentAt),
    };
  },
});

export const markTraining = mutation({
  args: {
    childId: v.id("children"),
    itemId: v.string(),
    kind: v.union(v.literal("memorization"), v.literal("practice")),
  },
  handler: async (ctx, args) => upsertReview(ctx, args.childId, args.itemId, args.kind, "training"),
});

export const requestLiveReview = mutation({
  args: {
    childId: v.id("children"),
    itemId: v.string(),
    kind: v.union(v.literal("memorization"), v.literal("practice")),
  },
  handler: async (ctx, args) => upsertReview(ctx, args.childId, args.itemId, args.kind, "pending"),
});

export const setRecordingConsent = action({
  args: { childId: v.id("children"), allowed: v.boolean(), parentToken: v.string() },
  handler: async (ctx, { parentToken, ...args }): Promise<null> =>
    ctx.runMutation(internal.review.setRecordingConsentInternal, {
      ...args,
      ...(await parentCredentials(ctx, parentToken)),
    }),
});

// Server time makes each dashboard authorization check respect session expiry despite query caching.
export const dashboard = action({
  args: { parentToken: v.string() },
  handler: async (ctx, { parentToken }): Promise<DashboardChild[]> =>
    ctx.runQuery(internal.review.dashboardInternal, {
      ...(await parentCredentials(ctx, parentToken)),
      now: Date.now(),
    }),
});

export const decide = action({
  args: {
    reviewId: v.id("reviews"),
    approved: v.boolean(),
    message: v.string(),
    parentToken: v.string(),
  },
  handler: async (ctx, { parentToken, ...decision }): Promise<null> =>
    ctx.runMutation(internal.review.decideInternal, {
      ...decision,
      ...(await parentCredentials(ctx, parentToken)),
    }),
});

export const removeRecording = action({
  args: { recordingId: v.id("recordings"), parentToken: v.string() },
  handler: async (ctx, { parentToken, recordingId }): Promise<null> =>
    ctx.runMutation(internal.review.removeRecordingInternal, {
      recordingId,
      ...(await parentCredentials(ctx, parentToken)),
    }),
});

const parentArgs = { userId: v.id("users"), authSubject: v.string(), tokenHash: v.string() };

export const authorizeUpload = internalQuery({
  args: { childId: v.id("children"), itemId: v.string() },
  handler: async (ctx, args) => {
    const child = await requireOwnedChild(ctx, args.childId);
    if (!child.recordingConsentAt || !memoryItems.some((item) => item.id === args.itemId)) {
      throw new Error("RECORDING_NOT_ALLOWED");
    }
    return null;
  },
});

export const commitRecording = internalMutation({
  args: {
    childId: v.id("children"),
    itemId: v.string(),
    storageId: v.id("_storage"),
    durationMs: v.number(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const child = await requireOwnedChild(ctx, args.childId);
    if (!child.recordingConsentAt || !memoryItems.some((item) => item.id === args.itemId)) {
      throw new Error("RECORDING_NOT_ALLOWED");
    }
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) {
      throw new Error("INVALID_RECORDING");
    }
    const previous = await ctx.db
      .query("recordings")
      .withIndex("by_child_item", (q) => q.eq("childId", args.childId).eq("itemId", args.itemId))
      .unique();
    const recordingId = await ctx.db.insert("recordings", {
      householdId: child.householdId,
      childId: args.childId,
      itemId: args.itemId,
      storageId: args.storageId,
      contentType: "audio/wav",
      size: args.size,
      durationMs: args.durationMs,
      status: "pending",
      createdAt: Date.now(),
    });
    await upsertReview(ctx, args.childId, args.itemId, "memorization", "pending", recordingId);
    if (previous) {
      await ctx.storage.delete(previous.storageId);
      await ctx.db.delete(previous._id);
    }
    return recordingId;
  },
});

export const setRecordingConsentInternal = internalMutation({
  args: { childId: v.id("children"), allowed: v.boolean(), ...parentArgs },
  handler: async (ctx, args) => {
    await requireParentSession(ctx, args.userId, args.tokenHash, args.authSubject);
    const child = await ctx.db.get(args.childId);
    if (!child || child.householdId !== args.userId) {
      throw new Error("NOT_FOUND");
    }
    await ctx.db.patch(args.childId, { recordingConsentAt: args.allowed ? Date.now() : undefined });
  },
});

export const dashboardInternal = internalQuery({
  args: { ...parentArgs, now: v.number() },
  handler: async (ctx, args) => {
    await requireParentSession(ctx, args.userId, args.tokenHash, args.authSubject, args.now);
    const children = await ctx.db
      .query("children")
      .withIndex("by_household", (q) => q.eq("householdId", args.userId))
      .collect();
    return Promise.all(
      children
        .filter((child) => !child.deleting)
        .map(async (child) => {
          const [progress, attempts, reviews] = await Promise.all([
            ctx.db
              .query("progress")
              .withIndex("by_child", (q) => q.eq("childId", child._id))
              .collect(),
            ctx.db
              .query("activityAttempts")
              .withIndex("by_child", (q) => q.eq("childId", child._id))
              .collect(),
            ctx.db
              .query("reviews")
              .withIndex("by_child", (q) => q.eq("childId", child._id))
              .collect(),
          ]);
          return {
            child,
            summary: {
              lessons: {
                completed: progress.filter(
                  (item) =>
                    item.lessonCompleted &&
                    item.activityPassed &&
                    lessons.some((lesson) => lesson.id === item.lessonId),
                ).length,
                total: lessons.length,
              },
              memorization: {
                completed: reviews.filter(
                  (item) =>
                    item.kind === "memorization" &&
                    item.status === "approved" &&
                    memoryItems.some((memory) => memory.id === item.itemId),
                ).length,
                total: memoryItems.length,
              },
              practice: {
                completed: reviews.filter(
                  (item) =>
                    item.kind === "practice" &&
                    item.status === "approved" &&
                    practiceItems.some((practice) => practice.id === item.itemId),
                ).length,
                total: practiceItems.length,
              },
              firstAttempt: {
                correct: attempts.filter((item) => item.firstCorrect).length,
                total: attempts.filter((item) => item.firstCorrect !== undefined).length,
              },
              lastActivity:
                Math.max(
                  0,
                  child.updatedAt,
                  ...progress.map((item) => item.updatedAt),
                  ...attempts.map((item) => item.updatedAt),
                  ...reviews.map((item) => item.reviewedAt ?? item._creationTime),
                ) || undefined,
            },
            reviews: reviews
              .filter((item) => item.status === "pending")
              .map((item) => ({
                id: item._id,
                childId: child._id,
                childName: child.name,
                itemId: item.itemId,
                kind: item.kind,
                title:
                  memoryItems.find((memory) => memory.id === item.itemId)?.title ??
                  practiceItems.find((practice) => practice.id === item.itemId)?.instruction ??
                  item.itemId,
                recordingId: item.recordingId,
              })),
          };
        }),
    );
  },
});

export const decideInternal = internalMutation({
  args: { reviewId: v.id("reviews"), approved: v.boolean(), message: v.string(), ...parentArgs },
  handler: async (ctx, args) => {
    await requireParentSession(ctx, args.userId, args.tokenHash, args.authSubject);
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.householdId !== args.userId) {
      throw new Error("NOT_FOUND");
    }
    const message = args.message.trim();
    if (message.length > 300) {
      throw new Error("INVALID_MESSAGE");
    }
    await ctx.db.patch(args.reviewId, {
      status: args.approved ? "approved" : "retry",
      message,
      reviewedAt: Date.now(),
    });
    if (review.recordingId) {
      await ctx.db.patch(review.recordingId, { status: args.approved ? "approved" : "retry" });
    }
  },
});

export const removeRecordingInternal = internalMutation({
  args: { recordingId: v.id("recordings"), ...parentArgs },
  handler: async (ctx, args) => {
    await requireParentSession(ctx, args.userId, args.tokenHash, args.authSubject);
    const recording = await ctx.db.get(args.recordingId);
    if (!recording || recording.householdId !== args.userId) {
      throw new Error("NOT_FOUND");
    }
    await ctx.storage.delete(recording.storageId);
    await ctx.db.delete(recording._id);
    const review = await ctx.db
      .query("reviews")
      .withIndex("by_child_item", (q) =>
        q
          .eq("childId", recording.childId)
          .eq("itemId", recording.itemId)
          .eq("kind", "memorization"),
      )
      .unique();
    if (review) {
      await ctx.db.patch(review._id, { recordingId: undefined });
    }
  },
});

export const recordingForDownload = internalQuery({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, { recordingId }) => {
    const userId = await requireHousehold(ctx);
    const recording = await ctx.db.get(recordingId);
    if (!recording || recording.householdId !== userId) {
      throw new Error("NOT_FOUND");
    }
    await requireOwnedChild(ctx, recording.childId);
    return { storageId: recording.storageId, contentType: recording.contentType };
  },
});

async function upsertReview(
  ctx: MutationCtx,
  childId: Id<"children">,
  itemId: string,
  kind: "memorization" | "practice",
  status: "training" | "pending",
  recordingId?: Id<"recordings">,
) {
  const child = await requireOwnedChild(ctx, childId);
  const valid =
    kind === "memorization"
      ? memoryItems.some((item) => item.id === itemId)
      : practiceItems.some((item) => item.id === itemId);
  if (!valid) {
    throw new Error("ITEM_NOT_FOUND");
  }
  const prior = await ctx.db
    .query("reviews")
    .withIndex("by_child_item", (q) =>
      q.eq("childId", childId).eq("itemId", itemId).eq("kind", kind),
    )
    .unique();
  if (prior) {
    if (prior.status === "approved" && status === "training") {
      return null;
    }
    return ctx.db.patch(prior._id, { status, recordingId: recordingId ?? prior.recordingId });
  }
  return ctx.db.insert("reviews", {
    householdId: child.householdId,
    childId,
    itemId,
    kind,
    status,
    recordingId,
  });
}

type DashboardChild = {
  child: Doc<"children">;
  summary: {
    lessons: { completed: number; total: number };
    memorization: { completed: number; total: number };
    practice: { completed: number; total: number };
    firstAttempt: { correct: number; total: number };
    lastActivity: number | undefined;
  };
  reviews: {
    id: Id<"reviews">;
    childId: Id<"children">;
    childName: string;
    itemId: string;
    kind: "memorization" | "practice";
    title: string;
    recordingId: Id<"recordings"> | undefined;
  }[];
};
