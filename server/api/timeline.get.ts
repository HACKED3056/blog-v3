import { toZonedTemporal } from "~~/shared/utils/time"

export default defineEventHandler(async (event) => {
  const posts = await queryCollection(event, "content")
    .where("stem", "LIKE", "posts/%")
    .select("title", "description", "date", "updated", "path", "categories", "readingTime", "stats", "stem", "image")
    .all()

  // Group by individual date
  const timeline: Record<string, { date: string; title: string; desc: string; path: string; category: string; readingTime: string; stem: string; image: string; }[]> = {}

  for (const post of posts) {
    if (post.stats === false) continue
    if (!post.date) continue

    try {
      const d = toZonedTemporal(post.date as string)
      const dateKey = d.year + "-" + String(d.month).padStart(2, "0") + "-" + String(d.day).padStart(2, "0")
      if (!timeline[dateKey]) timeline[dateKey] = []
      timeline[dateKey].push({
        date: dateKey,
        title: post.title as string,
        desc: (post.description as string) || "",
        path: post.path as string,
        category: ((post.categories as string[]) || [])[0] || "未分类",
        readingTime: post.readingTime?.text || "",
        image: (post.image as string) || "",
        stem: post.stem as string
      })
    } catch { /* skip */ }
  }

  const sorted = Object.entries(timeline)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, entries]) => ({
      date: dateKey,
      entries: entries.sort((a, b) => b.date.localeCompare(a.date))
    }))

  return sorted
})