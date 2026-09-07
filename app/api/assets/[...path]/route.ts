import { readFile } from "node:fs/promises";
import { join } from "node:path";
import manifest from "@/assets/manifest.json";

const types: Record<string, string> = {
  svg: "image/svg+xml",
  webp: "image/webp",
  png: "image/png",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const name = path.join("/");
  const asset = manifest.assets.find((item) => item.path === name);
  const preview = process.env.NODE_ENV !== "production" && process.env.CONTENT_PREVIEW === "true";
  if (
    !asset ||
    path.some((part) => part === ".." || part.includes("\\")) ||
    (!preview && (!asset.publishable || asset.reviewStatus !== "approved"))
  ) {
    return new Response(null, { status: 404 });
  }
  try {
    const data = await readFile(join(process.cwd(), "assets", asset.path));
    return new Response(data, {
      headers: {
        "Content-Type": types[name.split(".").pop() ?? ""] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
