import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";
import { requireOwnedChild } from "./lib/authz";
import {
  type Answer,
  bookPageText,
  grade,
  isAutomatic,
  isStageComplete,
  lessonById,
  lessons,
  publicQuestion,
  worlds,
} from "./lib/content";

const answer = v.union(v.string(), v.array(v.string()), v.record(v.string(), v.string()));

function progress(ctx: QueryCtx | MutationCtx, childId: Parameters<typeof requireOwnedChild>[1]) {
  return ctx.db
    .query("progress")
    .withIndex("by_child", (q) => q.eq("childId", childId))
    .collect();
}

function unlocked(lesson: (typeof lessons)[number], completed: Set<string>) {
  return lesson.prerequisites.every((id) => completed.has(id));
}

export const map = query({
  args: { childId: v.id("children") },
  handler: async (ctx, { childId }) => {
    const child = await requireOwnedChild(ctx, childId);
    const records = await progress(ctx, childId);
    const completed = new Set(
      records
        .filter((record) => isStageComplete(lessonById(record.lessonId), record))
        .map((record) => record.lessonId),
    );
    const rewards = await ctx.db
      .query("rewards")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();
    return {
      child,
      worlds: worlds.map((world) => {
        const inWorld = lessons
          .filter((lesson) => lesson.world_id === world.id)
          .sort((a, b) => a.order - b.order);
        const next = inWorld.find(
          (lesson) => !completed.has(lesson.id) && unlocked(lesson, completed),
        );
        return {
          id: world.id,
          title: world.title,
          firstLessonId: inWorld[0]?.id ?? null,
          completed: inWorld.filter((lesson) => completed.has(lesson.id)).length,
          total: inWorld.length,
          available: Boolean(next),
          nextLessonId: next?.id ?? null,
          stages: inWorld.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            completed: completed.has(lesson.id),
            unlocked: unlocked(lesson, completed),
          })),
        };
      }),
      stars: rewards.reduce(
        (sum, reward) => sum + (reward.kind === "world_badge" ? 0 : reward.amount),
        0,
      ),
      badges: rewards
        .filter((reward) => reward.kind === "world_badge")
        .map((reward) => reward.rewardId),
    };
  },
});

export const lesson = query({
  args: { childId: v.id("children"), lessonId: v.string() },
  handler: async (ctx, args) => {
    await requireOwnedChild(ctx, args.childId);
    const content = lessonById(args.lessonId);
    if (!content) {
      throw new Error("LESSON_NOT_FOUND");
    }
    const records = await progress(ctx, args.childId);
    const completed = new Set(
      records
        .filter((record) => isStageComplete(lessonById(record.lessonId), record))
        .map((record) => record.lessonId),
    );
    if (!unlocked(content, completed)) {
      throw new Error("LESSON_LOCKED");
    }
    const segments = await ctx.db
      .query("segmentProgress")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .collect();
    const state = records.find((record) => record.lessonId === args.lessonId);
    return {
      id: content.id,
      worldId: content.world_id,
      title: content.title,
      segments: content.segments,
      sourcePages: content.source_pages.map((page) => ({ page, text: bookPageText(page) })),
      questions: content.questions.map(publicQuestion),
      state: {
        completedSegments: segments
          .filter((segment) => segment.lessonId === content.id)
          .map((segment) => segment.segmentId),
        lessonCompleted: state?.lessonCompleted ?? false,
        activityPassed: state?.activityPassed ?? false,
      },
    };
  },
});

export const completeSegment = mutation({
  args: { childId: v.id("children"), lessonId: v.string(), segmentId: v.string() },
  handler: async (ctx, args) => {
    const child = await requireOwnedChild(ctx, args.childId);
    const content = lessonById(args.lessonId);
    if (!content?.segments.some((segment) => segment.id === args.segmentId)) {
      throw new Error("SEGMENT_NOT_FOUND");
    }
    const records = await progress(ctx, args.childId);
    const completed = new Set(
      records
        .filter((record) => isStageComplete(lessonById(record.lessonId), record))
        .map((record) => record.lessonId),
    );
    if (!unlocked(content, completed)) {
      throw new Error("LESSON_LOCKED");
    }
    const existing = await ctx.db
      .query("segmentProgress")
      .withIndex("by_child_segment", (q) =>
        q.eq("childId", args.childId).eq("segmentId", args.segmentId),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("segmentProgress", {
        householdId: child.householdId,
        childId: args.childId,
        lessonId: args.lessonId,
        segmentId: args.segmentId,
        completedAt: Date.now(),
      });
    }
    const segments = await ctx.db
      .query("segmentProgress")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .collect();
    const lessonCompleted = content.segments.every(
      (segment) =>
        segment.id === args.segmentId || segments.some((saved) => saved.segmentId === segment.id),
    );
    await saveProgress(ctx, child.householdId, args.childId, args.lessonId, { lessonCompleted });
    if (lessonCompleted) {
      await award(
        ctx,
        child.householdId,
        args.childId,
        `lesson:${args.lessonId}`,
        "lesson_star",
        1,
      );
    }
    await awardWorldIfComplete(ctx, child.householdId, args.childId, content.world_id);
    return { lessonCompleted };
  },
});

export const submitActivity = mutation({
  args: { childId: v.id("children"), lessonId: v.string(), questionId: v.string(), answer },
  handler: async (ctx, args) => {
    const child = await requireOwnedChild(ctx, args.childId);
    const content = lessonById(args.lessonId);
    const question = content?.questions.find((item) => item.id === args.questionId);
    if (!content || !question) {
      throw new Error("QUESTION_NOT_FOUND");
    }
    const records = await progress(ctx, args.childId);
    const completed = new Set(
      records
        .filter((record) => isStageComplete(lessonById(record.lessonId), record))
        .map((record) => record.lessonId),
    );
    if (!unlocked(content, completed)) {
      throw new Error("LESSON_LOCKED");
    }
    const correct = grade(question, args.answer as Answer);
    const prior = await ctx.db
      .query("activityAttempts")
      .withIndex("by_child_question", (q) =>
        q.eq("childId", args.childId).eq("questionId", args.questionId),
      )
      .unique();
    if (prior) {
      await ctx.db.patch(prior._id, {
        passed: prior.passed || correct === true,
        attempts: prior.attempts + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("activityAttempts", {
        householdId: child.householdId,
        childId: args.childId,
        lessonId: args.lessonId,
        questionId: args.questionId,
        firstCorrect: correct ?? undefined,
        passed: correct === true,
        attempts: 1,
        updatedAt: Date.now(),
      });
    }
    const attempts = await ctx.db
      .query("activityAttempts")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .collect();
    const automatic = content.questions.filter(isAutomatic);
    const activityPassed =
      automatic.length > 0 &&
      automatic.every((item) =>
        item.id === question.id
          ? correct === true || prior?.passed
          : attempts.some((attempt) => attempt.questionId === item.id && attempt.passed),
      );
    await saveProgress(ctx, child.householdId, args.childId, args.lessonId, {
      firstAttemptCorrect: prior ? undefined : (correct ?? undefined),
    });
    if (activityPassed) {
      await saveProgress(ctx, child.householdId, args.childId, args.lessonId, {
        activityPassed,
      });
      await award(
        ctx,
        child.householdId,
        args.childId,
        `activity:${args.lessonId}`,
        "activity_stars",
        2,
      );
      await awardWorldIfComplete(ctx, child.householdId, args.childId, content.world_id);
    }
    return { correct, explanation: question.explanation };
  },
});

async function saveProgress(
  ctx: MutationCtx,
  householdId: Id<"users">,
  childId: Id<"children">,
  lessonId: string,
  patch: { lessonCompleted?: boolean; activityPassed?: boolean; firstAttemptCorrect?: boolean },
) {
  const existing = await ctx.db
    .query("progress")
    .withIndex("by_child_lesson", (q) => q.eq("childId", childId).eq("lessonId", lessonId))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, {
      ...(patch.firstAttemptCorrect === undefined || existing.firstAttemptCorrect !== undefined
        ? {}
        : { firstAttemptCorrect: patch.firstAttemptCorrect }),
      lessonCompleted: existing.lessonCompleted || patch.lessonCompleted === true,
      activityPassed: existing.activityPassed || patch.activityPassed === true,
      updatedAt: Date.now(),
    });
  } else {
    await ctx.db.insert("progress", {
      householdId,
      childId,
      lessonId,
      lessonCompleted: patch.lessonCompleted ?? false,
      activityPassed: patch.activityPassed ?? false,
      firstAttemptCorrect: patch.firstAttemptCorrect,
      updatedAt: Date.now(),
    });
  }
}

async function award(
  ctx: MutationCtx,
  householdId: Id<"users">,
  childId: Id<"children">,
  rewardId: string,
  kind: "lesson_star" | "activity_stars" | "world_badge",
  amount: number,
) {
  const existing = await ctx.db
    .query("rewards")
    .withIndex("by_child_reward", (q) => q.eq("childId", childId).eq("rewardId", rewardId))
    .unique();
  if (!existing) {
    await ctx.db.insert("rewards", { householdId, childId, rewardId, kind, amount });
  }
}

async function awardWorldIfComplete(
  ctx: MutationCtx,
  householdId: Id<"users">,
  childId: Id<"children">,
  worldId: string,
) {
  const records = await progress(ctx, childId);
  const worldLessons = lessons.filter((lesson) => lesson.world_id === worldId);
  const complete =
    worldLessons.length > 0 &&
    worldLessons.every((lesson) =>
      records.some((record) => record.lessonId === lesson.id && isStageComplete(lesson, record)),
    );
  if (complete) {
    await award(ctx, householdId, childId, `world:${worldId}`, "world_badge", 0);
  }
}
