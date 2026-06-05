import { toZonedTemporal } from "~~/shared/utils/time"

export default defineEventHandler(async (event) => {
  const posts = await queryCollection(event, "content")
    .where("stem", "LIKE", "posts/%")
    .select("title", "description", "date", "updated", "path", "categories", "readingTime", "stats", "stem")
    .all()

  // Group by year-month, sorted by date desc
  const timeline: Record<string, { date: string; title: string; desc: string; path: string; category: string; readingTime: string; stem: string }[]> = {}

  for (const post of posts) {
    if (post.stats === false) continue
    if (!post.date) continue

    try {
      const d = toZonedTemporal(post.date as string)
      const yearMonth = d.year + "-" + String(d.month).padStart(2, "0")
      const key = yearMonth + "-" + String(d.day).padStart(2, "0")

      if (!timeline[yearMonth]) timeline[yearMonth] = []

      timeline[yearMonth].push({
        date: key,
        title: post.title as string,
        desc: (post.description as string) || "",
        path: post.path as string,
        category: ((post.categories as string[]) || [])[0] || "未分类",
        readingTime: post.readingTime?.text || "",
        stem: post.stem as string
      })
    } catch { /* skip */ }
  }

  // Sort each month group by date desc
  for (const month in timeline) {
    timeline[month].sort((a, b) => b.date.localeCompare(a.date))
  }

  // Sort months desc
  const sorted = Object.entries(timeline)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, entries]) => ({
      month,
      entries
    }))

  return sorted
})
