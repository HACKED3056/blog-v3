<script setup lang=ts>
const { data: articles } = await useAsyncData('widget:article-update', () =>
  queryCollection('content')
    .where('stem', 'LIKE', 'posts/%')
    .select('title', 'updated', 'date', 'path', 'stem')
    .order('updated', 'DESC')
    .order('date', 'DESC')
    .limit(8)
    .all()
)

const list = computed(() => articles.value?.filter(a => a.stem !== 'posts/2026/example')?.map(a => ({
  label: a.updated || a.date,
  value: a.title,
  href: a.path,
})) || [])
</script>

<template>
<BlogWidget card title=文章更新>
  <ZDlGroup v-if=list.length :items=list size=small />
  <p v-else class=empty>暂无文章更新</p>
</BlogWidget>
</template>

<style scoped>
.empty {
  padding: 0.2em 0;
  opacity: 0.5;
}
</style>
