import { Temporal } from 'temporal-polyfill'
import { toZonedTemporal } from '~~/shared/utils/time'

// === 编辑日志（每次内容增长的记录） ===
// nuxt.config.ts afterParse 检测到 h2/字数增长时自动更新 edit-log.json
// 部署前运行: node -e "const e=require('./edit-log.json'); ..." 同步此数组
const editLog: { path: string; date: string; newH2: number; charGrowth: number }[] = [
  { path: "content/posts/2026/Pwn_ret2text.md", date: "2026-05-31", newH2: 2, charGrowth: 2303 }
]

export default defineEventHandler(async (event) => {
	const dailyCount = new Map<string, number>()

	for (const entry of editLog) {
		dailyCount.set(entry.date, (dailyCount.get(entry.date) || 0) + entry.newH2)
	}

	const posts = await queryCollection(event, 'content')
		.where('stem', 'LIKE', 'posts/%')
		.select('date')
		.all()

	for (const post of posts) {
		if (!post.date) continue
		try {
			const d = toZonedTemporal(post.date as string)
			const key = d.year + "-" + String(d.month).padStart(2, "0") + "-" + String(d.day).padStart(2, "0")
			dailyCount.set(key, (dailyCount.get(key) || 0) + 1)
		}
		catch { /* skip */ }
	}

	const query = getQuery(event)
	const targetYear = query.year ? Number(query.year) : Temporal.Now.plainDateISO().year

	const yearStart = Temporal.PlainDate.from({ year: targetYear, month: 1, day: 1 })
	const yearEnd = Temporal.PlainDate.from({ year: targetYear, month: 12, day: 31 })
	const today = Temporal.Now.plainDateISO()
	const endDate = targetYear === today.year && Temporal.PlainDate.compare(today, yearEnd) < 0 ? today : yearEnd
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