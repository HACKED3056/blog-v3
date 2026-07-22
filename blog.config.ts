import type { FeedEntry } from "./app/types/feed"

const basicConfig = {
	title: "HACKED",
	subtitle: "无论路途多么遥远，我们终将在旅途尽头再次相遇",
	// 长 description 利好于 SEO
	description: "无论路途多么遥远，我们终将在旅途尽头再次相遇",
	author: {
		name: "HACKED",
		avatar: "https://foruda.gitee.com/avatar/1782995786228285340/15786671_asus_hacked_1782995786.png",
	title: "ss0t_HACKED",
	desc: "一个刚刚入门的pwner，大手子ddw",
		email: "ss0t_HACKED@qq.com",
		homepage: "https://blog.ss0t-hacked.top/",
	},
	copyright: {
		abbr: "CC BY-NC-SA 4.0",
		name: "署名-非商业性使用-相同方式共享 4.0 国际",
		url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans",
	},
	favicon: "https://foruda.gitee.com/avatar/1782995786228285340/15786671_asus_hacked_1782995786.png",
	language: "zh-CN",
	timeEstablished: "2026-05-17",
	timeZone: "Asia/Shanghai",
	url: "https://blog.ss0t-hacked.top",
	defaultCategory: "未分类",
}

// 存储 nuxt.config 和 app.config 共用的配置
// 此处为启动时需要的配置，启动后可变配置位于 app/app.config.ts
// @keep-sorted
const blogConfig = {
	...basicConfig,

	article: {
		categories: {
			[basicConfig.defaultCategory]: { icon: "tabler:circle-dashed" },
			/** 实践可复用操作经验：工具/系统/部署/排障 */
			技术: { icon: "tabler:mouse", color: "#33aaff" },
			/** 编程：代码实现/工程实践/开发方法 */
			开发: { icon: "tabler:code", color: "#7777ff" },
			/** 安全：漏洞/CTF/恶意软件/安全事件分析 */
			安全: { icon: "tabler:bug", color: "#ff7733" },
			/** PWN：二进制漏洞利用/逆向工程（同时归入安全） */
			pwn: { icon: "tabler:terminal-2", color: "#cc44ff" },
			/** 比赛：CTF竞赛/真题复现/WP */
			比赛: { icon: "tabler:trophy", color: "#ffaa00" },
			/** 思考：观点讨论/复盘反思/行业或产品观察 */
			杂谈: { icon: "tabler:message", color: "#33bbaa" },
			/** 记录叙事：个人经历/校园家庭/日常片段 */
			生活: { icon: "tabler:leaf", color: "#ff7777" },
		},
		/** 文章版式，首个为默认版式 */
		types: {
			tech: {},
			story: {},
		},
		/** 分类排序方式，键为排序字段，值为显示名称 */
		order: {
			date: "创建日期",
			updated: "更新日期",
			// title: "标题",
		},
		/** 使用 pnpm new 新建文章时自动生成自定义链接（permalink/abbrlink） */
		useRandomPremalink: false,
		/** 隐藏基于文件路由（不是自定义链接）的 URL /post 路径前缀 */
		hidePostPrefix: true,
		/** 禁止搜索引擎收录的路径 */
		robotsNotIndex: ["/preview", "/previews/*"],
	},

	/** 博客 Atom 订阅源 */
	feed: {
		/** 订阅源最大文章数量 */
		limit: 50,
		/** 订阅源是否启用XSLT样式 */
		enableStyle: true,
	},

	/** 向 <head> 中添加脚本 */
	scripts: [
		// 自己部署的 Umami 统计服务
		{ "src": "https://zhi.example.site/zhi.js", "data-website-id": "a1997c81-a42b-46f6-8d1d-8fbd67a8ef41", "defer": true },
		// 自己网站的 Cloudflare Insights 统计服务
		{ "src": "https://static.cloudflareinsights.com/beacon.min.js", "data-cf-beacon": "{\"token\": \"97a4fe32ed8240ac8284e9bffaf03962\"}", "defer": true },
		// Twikoo 评论系统
		{ src: "https://cdnjs.cloudflare.com/ajax/libs/twikoo/1.6.44/twikoo.min.js", defer: true },
	],

	/** 自己部署的 Twikoo 服务 */
	twikoo: {
		envId: "https://twikoo.ss0t-hacked.top/",
		preload: "https://twikoo.ss0t-hacked.top/",
	},
}

/** 用于生成 OPML 和友链页面配置 */
export const myFeed: FeedEntry = {
	author: "HACKED的博客",
	link: blogConfig.url,
	feed: new URL("/atom.xml", blogConfig.url).toString(),
	icon: blogConfig.favicon,
	avatar: "https://foruda.gitee.com/avatar/1782995786228285340/15786671_asus_hacked_1782995786.png",
	title: "HACKED的博客",
	desc: "一个刚刚入门的pwner，大手子ddw",
	archs: ["Nuxt", "Vercel"],
	date: blogConfig.timeEstablished,
}

export default blogConfig
