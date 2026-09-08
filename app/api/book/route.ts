import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  try {
    const book = await readFile(join(process.cwd(), "content/source/book.pdf"));
    return new Response(book, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=teaching-children-islam.pdf",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
