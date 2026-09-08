import { httpRouter } from "convex/server";
import { inspectWav } from "../lib/wav";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);
const cors = {
  "Access-Control-Allow-Origin": process.env.SITE_URL ?? "http://localhost:3000",
  Vary: "Origin",
};

http.route({
  path: "/recordings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let storageId: Id<"_storage"> | undefined;
    try {
      const url = new URL(request.url);
      const childId = url.searchParams.get("childId") as Id<"children"> | null;
      const itemId = url.searchParams.get("itemId");
      if (!childId || !itemId || request.headers.get("Content-Type") !== "audio/wav") {
        return new Response("Invalid request", { status: 400, headers: cors });
      }
      await ctx.runQuery(internal.review.authorizeUpload, { childId, itemId });
      const bytes = await request.arrayBuffer();
      const inspected = inspectWav(bytes);
      storageId = await ctx.storage.store(new Blob([bytes], { type: "audio/wav" }));
      const recordingId = await ctx.runMutation(internal.review.commitRecording, {
        childId,
        itemId,
        storageId,
        ...inspected,
      });
      return Response.json({ recordingId }, { headers: cors });
    } catch {
      if (storageId) {
        await ctx.storage.delete(storageId);
      }
      return new Response("Recording rejected", { status: 400, headers: cors });
    }
  }),
});

http.route({
  path: "/recordings",
  method: "OPTIONS",
  handler: httpAction(
    async () =>
      new Response(null, {
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      }),
  ),
});

http.route({
  path: "/recording",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const recordingId = new URL(request.url).searchParams.get("id");
    if (!recordingId) {
      return new Response("Missing recording", { status: 400 });
    }
    try {
      const recording = await ctx.runQuery(internal.review.recordingForDownload, {
        recordingId: recordingId as Id<"recordings">,
      });
      const blob = await ctx.storage.get(recording.storageId);
      if (!blob) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(blob, {
        headers: {
          ...cors,
          "Content-Type": recording.contentType,
          "Cache-Control": "private, no-store",
          "Content-Disposition": "inline",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }),
});

http.route({
  path: "/recording",
  method: "OPTIONS",
  handler: httpAction(
    async () =>
      new Response(null, {
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization",
          "Access-Control-Max-Age": "86400",
        },
      }),
  ),
});
export default http;
