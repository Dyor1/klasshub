import type { MetadataRoute } from "next";

const siteUrl = "https://klasshub.ng";

/** Only pages worth a search result. Everything here is public, static and
 *  meaningful on its own — no login screens, which rank for nothing and take
 *  crawl budget from the pages that sell. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, MetadataRoute.Sitemap[number]["changeFrequency"], number][] = [
    ["", "weekly", 1],
    ["/about", "monthly", 0.7],
    ["/contact", "monthly", 0.6],
    ["/register", "monthly", 0.8],
    ["/privacy", "yearly", 0.3],
    ["/terms", "yearly", 0.3],
  ];

  const lastModified = new Date();

  return pages.map(([path, changeFrequency, priority]) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
