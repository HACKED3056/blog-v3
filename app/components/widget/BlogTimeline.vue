<script setup lang="ts">
const { data: timeline } = await useLazyAsyncData("timeline", () =>
  $fetch("/api/timeline")
)

function monthLabel(m: string) {
  const parts = m.split("-")
  return parts[0] + " 年 " + parts[1] + " 月"
}

function categoryColor(cat: string) {
  const colors: Record<string, string> = {
    pwn: "var(--c-contrib-3, #30a14e)",
    "安全": "var(--c-contrib-2, #40c463)",
    "比赛": "var(--c-contrib-4, #196127)",
    "技术": "var(--c-contrib-1, #9be9a8)",
  }
  return colors[cat] || "var(--c-border)"
}
</script>

<template>
  <BlogWidget card title="写作时间线">
    <div v-if="timeline" class="timeline">
      <div v-for="group in timeline" :key="group.month" class="month-group">
        <div class="month-header">
          <span class="month-label">{{ monthLabel(group.month) }}</span>
          <span class="month-count">{{ group.entries.length }} 篇</span>
        </div>
        <div class="entries">
          <UtilLink
            v-for="entry in group.entries"
            :key="entry.path"
            class="entry"
            :to="entry.path"
          >
            <div class="entry-dot" :style="{ background: categoryColor(entry.category) }" />
            <div class="entry-date">{{ entry.date.slice(-2) }}日</div>
            <div class="entry-body">
              <div class="entry-title">{{ entry.title }}</div>
              <div v-if="entry.desc" class="entry-desc">{{ entry.desc }}</div>
            </div>
            <div class="entry-meta">
              <span class="entry-category">{{ entry.category }}</span>
              <span class="entry-reading">{{ entry.readingTime }}</span>
            </div>
          </UtilLink>
        </div>
      </div>
      <p v-if="!timeline.length" class="empty">暂无写作记录</p>
    </div>
    <p v-else class="empty">加载中...</p>
  </BlogWidget>
</template>

<style scoped>
.timeline {
  font-size: 0.85em;
}

.month-group {
  margin-bottom: 1.5em;
}

.month-header {
  display: flex;
  align-items: center;
  gap: 0.6em;
  margin-bottom: 0.6em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--c-border);
}

.month-label {
  font-weight: 600;
  font-size: 1.1em;
}

.month-count {
  font-size: 0.8em;
  color: var(--c-text-secondary);
}

.entries {
  position: relative;
  padding-left: 1.2em;
}

/* Vertical line */
.entries::before {
  content: "";
  position: absolute;
  left: 5px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--c-border);
  border-radius: 1px;
}

.entry {
  display: flex;
  align-items: flex-start;
  gap: 0.6em;
  padding: 0.4em 0.6em;
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
  position: relative;
}

.entry:hover {
  background: var(--c-bg-secondary, rgba(127,127,127,0.08));
}

.entry-dot {
  position: absolute;
  left: -1.1em;
  top: 0.7em;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--c-bg);
  flex-shrink: 0;
  z-index: 1;
}

.entry-date {
  font-size: 0.85em;
  color: var(--c-text-secondary);
  min-width: 2em;
  padding-top: 0.1em;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.entry-body {
  flex: 1;
  min-width: 0;
}

.entry-title {
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-desc {
  font-size: 0.8em;
  color: var(--c-text-secondary);
  line-height: 1.3;
  margin-top: 0.1em;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entry-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2em;
  font-size: 0.78em;
  flex-shrink: 0;
}

.entry-category {
  color: var(--c-text-secondary);
  background: var(--c-bg-secondary, rgba(127,127,127,0.1));
  padding: 0.1em 0.4em;
  border-radius: 3px;
}

.entry-reading {
  color: var(--c-text-3);
}

.empty {
  opacity: 0.5;
  padding: 0.2em 0;
}
</style>