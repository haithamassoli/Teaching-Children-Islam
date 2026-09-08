import type { MetadataRoute } from "next";
import { lessons } from "../lib/catalog";
import { siteUrl } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return siteUrl
    ? [
        "/",
        "/explore",
        "/library",
        "/fantasy",
        "/privacy",
        "/credits",
        ...lessons.map((lesson) => `/explore/${lesson.id}`),
      ].map((path) => ({ url: new URL(path, siteUrl).href }))
    : [];
}
