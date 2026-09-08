import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericActionCtx, GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;
type AuthCtx = Ctx | GenericActionCtx<DataModel>;

export async function requireHousehold(ctx: AuthCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }
  if ("db" in ctx) {
    const [user, household] = await Promise.all([
      ctx.db.get(userId),
      ctx.db
        .query("households")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique(),
    ]);
    if (!user || household?.deleting) {
      throw new Error("UNAUTHENTICATED");
    }
  }
  return userId;
}

export async function requireOwnedChild(
  ctx: Ctx,
  childId: Id<"children">,
): Promise<Doc<"children">> {
  const householdId = await requireHousehold(ctx);
  const record = await ctx.db.get(childId);
  if (!record || record.householdId !== householdId || record.deleting) {
    throw new Error("NOT_FOUND");
  }
  return record;
}

export async function requireParentSession(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  userId: Id<"users">,
  tokenHash: string,
  authSubject: string,
) {
  const session = await ctx.db
    .query("parentSessions")
    .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (
    !session ||
    session.userId !== userId ||
    session.authSubject !== authSubject ||
    session.expiresAt <= Date.now()
  ) {
    throw new Error("PARENT_AUTH_REQUIRED");
  }
}
