import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/family", "/qa/", "/api/", "/offline.html"] },
    sitemap: siteUrl ? new URL("/sitemap.xml", siteUrl).href : undefined,
  };
}
