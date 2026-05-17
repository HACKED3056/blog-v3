import type { FeedGroup } from "../app/types/feed"
import { myFeed } from "../blog.config"

export default [
	{
		name: "特别鸣谢",
		desc: "特别鸣谢",
		entries: [
			{
				author: "纸鹿摸鱼处",
				title: "纸鹿摸鱼处",
				desc: "感谢前端大手子开源博客系统，快去围观前端大手子！",
				link: "https://blog.zhilu.site/",
				icon: "https://weavatar.com/avatar/47c0f2e82b76d9b10eb3023df9e02e4e3fdbeaf5b74b842063f207971e7fbe7b?s=160",
				avatar: "https://weavatar.com/avatar/47c0f2e82b76d9b10eb3023df9e02e4e3fdbeaf5b74b842063f207971e7fbe7b?s=160",
				date: "2026-05-17",
			},
		],
	},
	{
		name: "我的博客",
		desc: "我的个人博客",
		entries: [myFeed],
	},
	{
		name: "CTF-Weber",
		desc: "CTF-Weber",
		entries: [
			{
				author: "康可ing",
				title: "康可ing",
				desc: "这是康神！web大手子",
				link: "https://blog.yanxisishi.top/",
				icon: "https://q1.qlogo.cn/g?b=qq&nk=3497863696&s=640",
				avatar: "https://q1.qlogo.cn/g?b=qq&nk=3497863696&s=640",
				date: "2026-05-17",
			},
		],
	},
] satisfies FeedGroup[]
