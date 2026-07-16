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
		name: "HACKED的的小窝",
		desc: "HACKED的的小窝",
		entries: [myFeed,
			{
				author: "HACKED的仓库",
				title: "HACKED的仓库",
				desc: "我的Gitee仓库",
				link: "https://gitee.com/ASUS_HACKED",
				icon: "https://foruda.gitee.com/avatar/1782995786228285340/15786671_asus_hacked_1782995786.png",
				avatar: "https://foruda.gitee.com/avatar/1782995786228285340/15786671_asus_hacked_1782995786.png",
				date: "2026-05-17",
			},
		],
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
			{
				author: "Nxg7",
				title: "Nxg7",
				desc: "一个废物的web手的笔记（其实是大手子）",
				link: "https://flowus.cn/share/fe11a674-0c86-4184-85f6-70d9b4213547",
				icon: "https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492493/o_260519025221_2D62E46F4EC2535B630B2F269163FE59.jpg",
				avatar: "https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492493/o_260519025221_2D62E46F4EC2535B630B2F269163FE59.jpg",
				date: "2026-05-19",
			},
			{
				author: "Jasmine_Iris",
				title: "Jasmine_Iris",
				desc: "Lanny扶不上墙",
				link: "https://jasmine-iris.top/",
				icon: "https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492493/o_260519153227_94a0a929f3a0a33c9b65237010e5da51.png",
				avatar: "https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492493/o_260519153227_94a0a929f3a0a33c9b65237010e5da51.png",
				date: "2026-05-19",
			},
			{
				author: "Nxg7的第二个小窝",
				title: "Nxg7的第二个小窝",
				desc: "",
				link: "https://web218.github.io",
				icon: "https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492493/o_260519025221_2D62E46F4EC2535B630B2F269163FE59.jpg",
				avatar: "https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492493/o_260519025221_2D62E46F4EC2535B630B2F269163FE59.jpg",
				date: "2026-07-16",
			},
			{
				author: "凌安的小窝",
				title: "凌安的小窝",
				desc: "练习ctf-web两个月半哦",
				link: "https://oneloveyushi.top",
				icon: "https://img2024.cnblogs.com/blog/3823631/202607/3823631-20260705132302916-2066211351.jpg",
				avatar: "https://img2024.cnblogs.com/blog/3823631/202607/3823631-20260705132302916-2066211351.jpg",
				date: "2026-07-13",
			},
		],
	},
	{
		name: "CTF-Pwner",
		desc: "CTF-Pwner",
		entries: [
			{
				author: "HFTTC",
				title: "HFTTC",
				desc: "偶遇100篇pwn笔记大手子",
				link: "https://idcm-svg.github.io/HFTTC.github.io/catalog/",
				icon: "https://idcm-svg.github.io/HFTTC.github.io/avatar/head.jpg",
				avatar: "https://idcm-svg.github.io/HFTTC.github.io/avatar/head.jpg",
				date: "2026-05-24",
			},
		],
	},
	{
		name: "漫游",
		desc: "网上冲浪看到的一些好的学习文章",
		entries: [
			{
				author: "渗透计划&CTF",
				title: "渗透计划&CTF",
				desc: "",
				link: "https://www.yuque.com/dingdangmao-qcyws/wletnw",
				icon: "",
				avatar: "",
				date: "2026-06-11",
			},
		],
	},
] satisfies FeedGroup[]
