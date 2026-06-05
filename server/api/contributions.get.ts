import { Temporal } from "temporal-polyfill"
import { toZonedTemporal } from "~~/shared/utils/time"

const editLog: { path: string; date: string; newH2: number; charGrowth: number }[] =
// @edit-log-start
[
    {
        "path": "posts/2026/Pwn_ret2text",
        "date": "2026-05-31",
        "newH2": 2,
        "charGrowth": 2303
    },
    {
        "path": "posts/2026/Pwn-Canary保护",
        "date": "2026-06-05",
        "newH2": 1,
        "charGrowth": 0
    },
    {
        "path": "posts/2026/Pwn-ret2libc",
        "date": "2026-06-05",
        "newH2": 1,
        "charGrowth": 0
    },
    {
        "path": "posts/2026/Pwn-ret2shellcode",
        "date": "2026-06-05",
        "newH2": 1,
        "charGrowth": 0
    }
]
// @edit-log-end

export default defineEventHandler(async (event) => {
  const dailyCount = new Map<string, number>()
  for (const entry of editLog) {
    dailyCount.set(entry.date, (dailyCount.get(entry.date) || 0) + entry.newH2)
  }
  const posts = await queryCollection(event, "content")
    .where("stem", "LIKE", "posts/%")
    .all()
  for (const post of posts) {
    if (post.stats === false) continue
    if (!post.date) continue
    try {
      const d = toZonedTemporal(post.date as string)
      const key = d.year + "-" + String(d.month).padStart(2, "0") + "-" + String(d.day).padStart(2, "0")
      dailyCount.set(key, (dailyCount.get(key) || 0) + 1)
    } catch { /* skip */ }
  }
  const query = getQuery(event)
  const targetYear = query.year ? Number(query.year) : Temporal.Now.plainDateISO().year
  // Find the first date with contributions to trim empty months
  const sortedDates = [...dailyCount.entries()]
    .filter(([_, count]) => count > 0)
    .filter(([date]) => date.startsWith(targetYear.toString()))
    .map(([date]) => Temporal.PlainDate.from(date))
    .sort(Temporal.PlainDate.compare)
  const firstActive = sortedDates.length > 0 ? sortedDates[0] : Temporal.PlainDate.from({ year: targetYear, month: 1, day: 1 })
  const yearStart = Temporal.PlainDate.from({ year: firstActive.year, month: firstActive.month, day: firstActive.day })
  const yearEnd = Temporal.PlainDate.from({ year: targetYear, month: 12, day: 31 })
  const todayDate = Temporal.Now.plainDateISO()
  const endDate = targetYear === todayDate.year ? todayDate : Temporal.PlainDate.from({ year: targetYear, month: 12, day: 31 })
  const totalDays = endDate.since(yearStart).days + 1
  const contributions: { date: string; count: number; level: number }[] = []
  let totalCount = 0
  for (let i = 0; i < totalDays; i++) {
    const d = yearStart.add({ days: i })
    const key = d.year + "-" + String(d.month).padStart(2, "0") + "-" + String(d.day).padStart(2, "0")
    const count = dailyCount.get(key) || 0
    totalCount += count
    const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4
    contributions.push({ date: key, count, level })
  }
  const startDow = yearStart.dayOfWeek % 7
  const weeks = Math.ceil((totalDays + startDow) / 7)
  return { contributions, totalCount, year: targetYear, startDate: yearStart.toString(), weeks }
})