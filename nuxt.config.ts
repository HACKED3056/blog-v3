import { resolve } from 'node:path'
import { arch, env, version as nodeVersion, platform } from 'node:process'
import { pathToFileURL } from 'node:url'
import { name as ciName, CLOUDFLARE_PAGES, GITHUB_ACTIONS, NETLIFY } from 'ci-info'
import { mapValues } from 'es-toolkit/object'
import { pascalCase } from 'es-toolkit/string'
import { Temporal } from 'temporal-polyfill'
import blogConfig from './blog.config'
import packageJson from './package.json'
import redirectList from './redirects.json'

function pluginPath(path: string) {
	return pathToFileURL(resolve(`./remark-plugins/${path}.ts`)).href
}

// 此处配置无需修改
export default defineNuxtConfig({
	devtools: { enabled: false },
	app: {

		head: {
			meta: [
				{ name: 'author', content: [blogConfig.author.name, blogConfig.author.email].filter(Boolean).join(', ') },
				{ name: 'color-scheme', content: 'light dark' },
				// 此处为元数据的生成器标识，不建议修改
				{ 'name': 'generator', 'content': `${pascalCase(packageJson.name)} ${packageJson.version}`, 'data-github-repo': packageJson.homepage },
				{ name: 'mobile-web-app-capable', content: 'yes' },
				{ name: 'referrer', content: 'no-referrer' },
			],
			link: [
				{ rel: 'icon', href: blogConfig.favicon },
				{ rel: 'alternate', type: 'application/atom+xml', href: '/atom.xml' },
				{ rel: 'preconnect', href: blogConfig.twikoo.preload },
				{ rel: 'stylesheet', href: 'https://lib.baomitu.com/KaTeX/0.16.9/katex.min.css', media: 'print', onload: 'this.media="all"' },
				// "InterVariable", "Inter", "InterDisplay"
				{ rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css', media: 'print', onload: 'this.media="all"' },
				// "JetBrains Mono", 思源宋体 "Noto Serif SC"
				{ rel: 'preconnect', href: 'https://fonts.gstatic.cn', crossorigin: '' },
				{ rel: 'stylesheet', href: 'https://fonts.googleapis.cn/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Noto+Serif+SC:wght@200..900&display=swap', media: 'print', onload: 'this.media="all"' },
				// 抖音美好体 "DOUYINSANSBOLD-GB"
				{ rel: 'stylesheet', href: 'https://fonts.bytedance.com/dfd/api/v1/css?family=DOUYINSANSBOLD-GB&display=swap', media: 'print', onload: 'this.media="all"' },
			],
			templateParams: {
				separator: '|',
			},
			titleTemplate: `%s %separator ${blogConfig.title}`,
			script: blogConfig.scripts,
		},
		rootAttrs: {
			id: 'blog-root',
		},
	},

	compatibilityDate: '2024-08-03',

	components: [
		{ path: '~/components/partial', prefix: 'Z' },
		'~/components',
	],

	css: [
		'@/assets/css/animation.scss',
		'@/assets/css/article.scss',
		'@/assets/css/color.scss',
		'@/assets/css/font.scss',
		'@/assets/css/main.scss',
		'@/assets/css/reusable.scss',
	],

	// @keep-sorted
	experimental: {
		extractAsyncDataHandlers: true,
		typescriptPlugin: true,
	},

	features: {
		inlineStyles: false,
	},

	nitro: {
		prerender: {
			// 修复部分平台会在文章路径后添加 `/`，导致闪现 404 错误
			// https://github.com/nuxt/content/issues/2378
			autoSubfolderIndex: CLOUDFLARE_PAGES || GITHUB_ACTIONS || NETLIFY ? false : undefined,
		},
	},

	// @keep-sorted
	routeRules: {
		"/**": { headers: { "Referrer-Policy": "no-referrer" } },
		...mapValues(redirectList, to => ({ redirect: { to, statusCode: 308 as const } })),
		'/api/stats': { prerender: true, headers: { 'Content-Type': 'application/json' } },
		'/atom.xml': { prerender: true, headers: { 'Content-Type': 'application/xml' } },
		'/favicon.ico': { redirect: { to: blogConfig.favicon } },
	},

	runtimeConfig: {
		// @keep-sorted
		public: {
			arch,
			buildTime: Temporal.Now.zonedDateTimeISO().toString(),
			// EdgeOne 检测暂时不可用
			ci: env.TENCENTCLOUD_RUNENV === 'SCF' ? 'EdgeOne' : ciName || '',
			nodeVersion,
			platform,
		},
	},

	/** 在生产环境启用 sourcemap */
	// sourcemap: true,

	typescript: {
		nodeTsConfig: {
			// @keep-sorted
			include: [
				'../remark-plugins/**/*.ts',
				'../scripts/**/*.ts',
			],
		},
	},

	vite: {
		css: {
			preprocessorOptions: {
				scss: {
					additionalData: '@use "@/assets/css/_variable.scss" as *;',
				},
			},
		},
		define: {
			/** 在生产环境启用 Vue DevTools */
			// __VUE_PROD_DEVTOOLS__: 'true',
			/** 在生产环境启用 Vue 水合不匹配详情 */
			// __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
		},
		optimizeDeps: {
			// @keep-sorted
			include: ['@shikijs/colorized-brackets', '@shikijs/transformers', '@unhead/schema-org/vue', '@vue/devtools-core', '@vue/devtools-kit', 'embla-carousel-autoplay', 'embla-carousel-vue', 'embla-carousel-wheel-gestures', 'es-toolkit/array', 'es-toolkit/math', 'es-toolkit/object', 'es-toolkit/promise', 'es-toolkit/string', 'minisearch', 'parse-domain', 'plain-shiki', 'shiki/themes/catppuccin-latte.mjs', 'shiki/themes/one-dark-pro.mjs', 'temporal-polyfill', 'vue-tippy'],
		},
		server: {
			allowedHosts: true,
		},
	},

	// @keep-sorted
	modules: [
		'@bikariya/image-viewer',
		'@bikariya/modals',
		'@bikariya/shiki',
		// @nuxt/a11y,
		'@nuxt/content',
		'@nuxt/hints',
		'@nuxt/icon',
		'@nuxt/image',
		'@nuxtjs/color-mode',
		'@nuxtjs/seo',
		'@pinia/nuxt',
		'@vueuse/nuxt',
		'nuxt-llms',
		'unplugin-yaml/nuxt',
	],

	colorMode: {
		preference: 'system',
		fallback: 'light',
		classSuffix: '',
	},

	content: {
		build: {
			markdown: {
				highlight: false,
				// @keep-sorted
				remarkPlugins: {
					[pluginPath('remark-music')]: {},
					'remark-math': {},
					'remark-reading-time': {},
				},
				// @keep-sorted
				rehypePlugins: {
					[pluginPath('rehype-meta-slots')]: {},
					'rehype-katex': {},
				},
				toc: { depth: 4, searchDepth: 4 },
			},
		},
		experimental: {
			sqliteConnector: 'native',
		},
	},

	hooks: {
		'ready': () => {
			console.info(`
================================
${pascalCase(packageJson.name)} ${packageJson.version}
${packageJson.homepage}
================================
`)
		},
		'content:file:afterParse': async (ctx) => {
			const { permalink, path } = ctx.content as Record<string, string | undefined>
			// 优先使用自定义链接（permalink/abbrlink），其次隐藏基于文件路由的 URL 中的 /posts 前缀
			if (permalink)
				ctx.content.path = permalink
			else if (blogConfig.article.hidePostPrefix && path?.startsWith('/posts/'))
				ctx.content.path = path.slice('/posts'.length)
			// 通过内容 hash 检测实际变更，追踪内容增长贡献
			const content = ctx.content as Record<string, any>

			// 纸鹿学姐的文章不计入字数统计
			if (content.stem === 'posts/2026/example' && content.readingTime) {
				content.readingTime.words = 0
			}
			if (content.stem?.startsWith('posts/') && ctx.file?.path) {
				try {
					const { stat, readFile, writeFile } = await import('node:fs/promises')
					const { createHash } = await import('node:crypto')
					const { resolve } = await import('node:path')

					const raw = await readFile(ctx.file.path)
					const text = raw.toString()
					const hash = createHash('sha256').update(raw).digest('hex')
					const headings: string[] = [...text.matchAll(/^## (.+)$/gm)].map(m => m[1])
					const charCount = text.length
					const stem = content.stem

					const cachePath = resolve(process.cwd(), '.content-cache.json')
					let cache: Record<string, { hash: string; headings: string[]; charCount: number }> = {}
					try { cache = JSON.parse(await readFile(cachePath, 'utf-8')) }
					catch { /* 首次运行 */ }

					const prevRaw = cache[stem]
					const prev = typeof prevRaw === "object" && prevRaw !== null && Array.isArray(prevRaw.headings) ? prevRaw : { hash: typeof prevRaw === "string" ? prevRaw : "", headings: [] as string[], charCount: 0 }

					const changed = prev.hash !== hash
					const isNewFile = !(stem in cache)

					cache[stem] = { hash, headings, charCount }
					await writeFile(cachePath, JSON.stringify(cache, null, 2))

					if (changed) {
						const now = new Date()
						const pad = (n: number) => String(n).padStart(2, '0')
						const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

						const newHeadings = headings.filter(h => !prev.headings.includes(h)); const newH2 = newHeadings.length
						const charGrowth = Math.max(0, charCount - prev.charCount)
						const hasGrowth = !isNewFile && newH2 > 0

						if (hasGrowth) {
							const logPath = resolve(process.cwd(), 'edit-log.json')
							let log: { path: string; date: string; newH2: number; charGrowth: number }[] = []
							try { log = JSON.parse(await readFile(logPath, 'utf-8')) }
							catch { /* first run */ }

							log.push({ path: stem, date: dateStr, newH2, charGrowth })
							await writeFile(logPath, JSON.stringify(log))

							// sync API inline array
							const apiPath = resolve(process.cwd(), 'server/api/contributions.get.ts')
							let apiText = await readFile(apiPath, 'utf-8')
							const startMark = '// @edit-log-start'
							const endMark = '// @edit-log-end'
							const startIdx = apiText.indexOf(startMark)
							const endIdx = apiText.indexOf(endMark)
							if (startIdx >= 0 && endIdx >= 0) {
								const before = apiText.slice(0, startIdx + startMark.length)
								const after = apiText.slice(endIdx)
								const jsonStr = JSON.stringify(log, null, 4)
									.split('\n')
									.map((l, i) => i === 0 ? l : '\t' + l)
									.join('\n')
								apiText = before + '\n' + jsonStr + '\n' + after
								await writeFile(apiPath, apiText)
							}
						}

						// update timestamp only for files already in cache
						if (prev.hash) {
							content.updated = `${dateStr} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
						}
					}
				}
				catch { /* skip on errors */ }
			}
		},
	},
	icon: {
		customCollections: [
			{ prefix: 'zi', dir: './app/assets/icons' },
		],
		clientBundle: {
			scan: {
				globInclude: ['**\/*.{vue,jsx,tsx,ts,md,mdc,mdx}'],
			},
		},
	},

	image: {
		// 尽量以这些密度点对点显示
		densities: [1, 1.5, 2],
		format: ['avif', 'webp'],
		// Neylify 下 netlify 处理器无法显示站外图片，ipx 处理器无法显示站内图片，需彻底禁用
		// https://github.com/nuxt/image/issues/1353
		provider: 'none',
	},

	linkChecker: {
		// @keep-sorted
		skipInspections: [
			'no-baseless',
			'no-non-ascii-chars',
			'no-uppercase-chars',
		],
	},

	llms: {
		domain: blogConfig.url,
		title: blogConfig.title,
		description: blogConfig.description,
	},

	ogImage: {
		enabled: false,
	},

	robots: {
		disableNuxtContentIntegration: true,
		disallow: blogConfig.article.robotsNotIndex,
	},

	site: {
		name: "HACKED的小破站",
		url: blogConfig.url,
		defaultLocale: blogConfig.language,
	},
})
