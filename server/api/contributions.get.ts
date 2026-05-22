import { Temporal } from 'temporal-polyfill'
import { toZonedTemporal } from '~~/shared/utils/time'

export default defineEventHandler(async (event) => {
	const posts = await queryCollection(event, 'content')
		.where('stem', 'LIKE', 'posts/%')
		.select('date', 'updated')
		.all()

	const dailyCount = new Map<string, number>()
	const addDate = (raw: string | undefined) => {
		if (!raw) return
		try {
			const d = toZonedTemporal(raw)
			const key = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
			dailyCount.set(key, (dailyCount.get(key) || 0) + 1)
		}
		catch { /* skip invalid */ }
	}

	for (const post of posts) {
		addDate(post.date as string | undefined)
		if (post.updated && post.updated !== post.date) {
			addDate(post.updated as string | undefined)
		}
	}

	const query = getQuery(event)
	const targetYear = query.year ? Number(query.year) : Temporal.Now.plainDateISO().year

	// 当年 1 月 1 日 → 12 月 31 日（不往前补齐）
	const yearStart = Temporal.PlainDate.from({ year: targetYear, month: 1, day: 1 })
	const yearEnd = Temporal.PlainDate.from({ year: targetYear, month: 12, day: 31 })
	// 当年只显示到当天，往年显示全年
	const today = Temporal.Now.plainDateISO()
	const endDate = targetYear === today.year && Temporal.PlainDate.compare(today, yearEnd) < 0 ? today : yearEnd
	const totalDays = endDate.since(yearStart).days + 1

	const contributions: { date: string; count: number; level: number }[] = []
	let totalCount = 0

	for (let i = 0; i < totalDays; i++) {
		const d = yearStart.add({ days: i })
		const key = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
		const count = dailyCount.get(key) || 0
		totalCount += count
		const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4
		contributions.push({ date: key, count, level })
	}

	const startDow = yearStart.dayOfWeek % 7 // 0=Sun
	const weeks = Math.ceil((totalDays + startDow) / 7)

	return { contributions, totalCount, year: targetYear, startDate: yearStart.toString(), weeks }
})
