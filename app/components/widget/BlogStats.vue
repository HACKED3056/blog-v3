<script setup lang="ts">
import { UtilDate } from #components

const appConfig = useAppConfig()
const runtimeConfig = useRuntimeConfig()
const articleUpdate = useNuxtData('widget:article-update')

// 响应头不正确时，stats.value 可能会是字符串，首次属性访问可能为 undefined
const { data: stats } = useFetch(/api/stats)

const yearlyTip = computed(() => Object
	.entries(stats.value?.annual || {})
	.reverse()
	.map(([year, item]) => )
	.join(n) || 数据获取失败,
)

const blogStats = [{
	label: 运营时长,
	value: timeElapse(appConfig.timeEstablished),
	tip: ,
}, {
	label: 上次更新,
	value: () => h(UtilDate, {
		date: articleUpdate.data.value?.[0]?.updated || runtimeConfig.public.buildTime,
		relative: true,
		tipPrefix: articleUpdate.data.value?.[0]?.updated ? "" : "构建于",
	}),
}, {
	label: 总字数,
	value: computed(() => formatNumber(stats.value?.total?.words) || --),
	tip: yearlyTip,
}]
</script>

<template>
<BlogWidget card title="博客统计">
	<ZDlGroup :items="blogStats" size="small" />
</BlogWidget>
</template>
