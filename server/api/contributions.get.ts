import { Temporal } from 'temporal-polyfill'
import { toZonedTemporal } from '~~/shared/utils/time'

export default defineEventHandler(async (event) => {
	// 读取编辑日志（每次内容增长的记录）
	const dailyCount = new Map<string, number>()
	try {
		const { readFile } = await import('node:fs/promises')
		const { resolve } = await import('node:path')
		const logPath = resolve(process.cwd(), 'edit-log.json')
		const editLog = JSON.parse(await readFile(logPath, 'utf-8')) as { path: string; date: string; newH2: number; charGrowth: number }[]

		for (const entry of editLog) {
			// 每新增一个 ## = 1 贡献，每增 200 字 = 1 贡献
			const points = entry.newH2 + Math.ceil(entry.charGrowth / 500)
			dailyCount.set(entry.date, (dailyCount.get(entry.date) || 0) + points)
		}
	}
	catch { /* 尚无编辑日志 */ }

	// 文章创建日期也算贡献
	const posts = await queryCollection(event, 'content')
		.where('stem', 'LIKE', 'posts/%')
		.select('date')
		.all()

	for (const post of posts) {
		if (!post.date) continue
		try {
			const d = toZonedTemporal(post.date as string)
			const key = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
			dailyCount.set(key, (dailyCount.get(key) || 0) + 1)
		}
		catch { /* skip invalid */ }
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
		const key = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
		const count = dailyCount.get(key) || 0
		totalCount += count
		const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4
		contributions.push({ date: key, count, level })
	}

	const startDow = yearStart.dayOfWeek % 7
	const weeks = Math.ceil((totalDays + startDow) / 7)

	return { contributions, totalCount, year: targetYear, startDate: yearStart.toString(), weeks }
})