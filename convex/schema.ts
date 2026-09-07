import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  households: defineTable({
    userId: v.id("users"),
    pinHash: v.optional(v.string()),
    pinSalt: v.optional(v.string()),
    pinIterations: v.optional(v.number()),
    pinFailures: v.number(),
    pinLockedUntil: v.optional(v.number()),
  }).index("by_user", ["userId"]),
  parentSessions: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(),
    authSubject: v.string(),
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["tokenHash"]),
  children: defineTable({
    householdId: v.id("users"),
    name: v.string(),
    age: v.number(),
    gender: v.union(v.literal("male"), v.literal("female")),
    characterId: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_household", ["householdId"]),
  progress: defineTable({
    householdId: v.id("users"),
    childId: v.id("children"),
    lessonId: v.string(),
    lessonCompleted: v.boolean(),
    activityPassed: v.boolean(),
    firstAttemptCorrect: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_child", ["childId"])
    .index("by_child_lesson", ["childId", "lessonId"]),
  segmentProgress: defineTable({
    householdId: v.id("users"),
    childId: v.id("children"),
    lessonId: v.string(),
    segmentId: v.string(),
    completedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_child", ["childId"])
    .index("by_child_segment", ["childId", "segmentId"]),
  activityAttempts: defineTable({
    householdId: v.id("users"),
    childId: v.id("children"),
    lessonId: v.string(),
    questionId: v.string(),
    firstCorrect: v.optional(v.boolean()),
    passed: v.boolean(),
    attempts: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_child", ["childId"])
    .index("by_child_question", ["childId", "questionId"]),
  rewards: defineTable({
    householdId: v.id("users"),
    childId: v.id("children"),
    rewardId: v.string(),
    kind: v.union(v.literal("lesson_star"), v.literal("activity_stars"), v.literal("world_badge")),
    amount: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_child", ["childId"])
    .index("by_child_reward", ["childId", "rewardId"]),
  recordings: defineTable({
    householdId: v.id("users"),
    childId: v.id("children"),
    itemId: v.string(),
    storageId: v.id("_storage"),
    contentType: v.string(),
    size: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("retry")),
    createdAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_child", ["childId"])
    .index("by_child_item", ["childId", "itemId"]),
  reviews: defineTable({
    householdId: v.id("users"),
    childId: v.id("children"),
    itemId: v.string(),
    kind: v.union(v.literal("memorization"), v.literal("practice")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("retry")),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_household", ["householdId"])
    .index("by_child", ["childId"]),
});
