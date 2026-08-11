import type { MetadataRoute } from "next";
import agendaData from "@/data/agenda.json";
import type { Agenda } from "agenda-views/headless";
import { siteUrl } from "@/lib/site";

const agenda = agendaData as Agenda;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: siteUrl, lastModified, changeFrequency: "daily", priority: 1 },
    // day views are the only filter state worth indexing on its own; stage and
    // query permutations would be near-duplicate pages
    ...agenda.days.map((day) => ({
      url: `${siteUrl}/?day=${day.id}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
