<script setup lang="ts">
const appConfig = useAppConfig()
useSeoMeta({
  title: '笔记贡献',
  description: `${appConfig.title}的笔记贡献热力图，记录过去一年的写作情况。`,
})

const layoutStore = useLayoutStore()
layoutStore.setAside([])
</script>

<template>
  <div class="contribution-page">
    <h1 class="page-title">笔记贡献</h1>
    <p class="page-desc">过去一年我的写作记录，每一格代表一篇笔记。</p>
    <WidgetBlogContribution class="large" />
  </div>
</template>

<style scoped>
.contribution-page {
  padding: 2rem 1.5rem;
  max-width: 960px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.8em;
  font-weight: 700;
  margin-bottom: 0.3em;
}

.page-desc {
  color: var(--c-text-secondary);
  margin-bottom: 2em;
  font-size: 0.95em;
}

:deep(.widget-header) {
  display: none;
}

:deep(.widget-body.widget-card) {
  background: none;
  padding: 0;
  border-radius: 0;
}

:deep(.contribution) {
  font-size: 1em;
}

/* Override cell size via CSS variables */
:deep(.graph) {
  --cell-w: 18px !important;
  --cell-h: 16px !important;
  --col-label: 3em !important;
  --row-label: 1.5em !important;
  gap: 3px !important;
}

:deep(.cell) {
  border-radius: 3px !important;
}

:deep(.cell:hover) {
  transform: scale(1.45);
}

:deep(.days span) {
  font-size: 0.8em !important;
  line-height: 16px !important;
}

:deep(.months span) {
  font-size: 0.8em !important;
}

:deep(.total) {
  font-size: 1.1em;
  margin-bottom: 1em;
}

:deep(.legend) {
  margin-top: 0.8em;
  font-size: 0.85em !important;
}

/* Add level-4 to legend */
:deep(.legend .level-4) {
  display: inline-block;
}
</style>
