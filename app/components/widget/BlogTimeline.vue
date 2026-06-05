<script setup lang="ts">
const { data: timeline } = useFetch("/api/timeline")

function dateLabel(d: string) {
  if (!d) return ""
  const p = d.split("-")
  return p[0] + "." + p[1] + "." + p[2]
}
</script>

<template>
  <BlogWidget card title="写作时间线">
    <div v-if="timeline && timeline.length" class="timeline">
      <div v-for="(day, dayIdx) in timeline" :key="day.date" class="day-group">
        <div class="date-badge">{{ dateLabel(day.date) }}</div>

        <div
          v-for="(entry, entryIdx) in day.entries"
          :key="entry.path"
          class="timeline-entry"
          :class="(dayIdx + entryIdx) % 2 === 0 ? 'left' : 'right'"
        >
          <div class="entry-dot" />
          <UtilLink :to="entry.path" class="entry-card">
            <NuxtImg
              v-if="entry.image"
              class="entry-cover"
              :src="entry.image"
              loading="lazy"
              referrerpolicy="no-referrer"
              alt=""
            />
            <div v-else class="entry-cover entry-cover-fallback">📄</div>
            <div class="entry-info">
              <div class="entry-title">{{ entry.title }}</div>
              <div v-if="entry.desc" class="entry-desc">{{ entry.desc }}</div>
              <div class="entry-meta">
                <span class="entry-cat">{{ entry.category }}</span>
                <span class="entry-time">{{ entry.readingTime }}</span>
              </div>
            </div>
          </UtilLink>
        </div>
      </div>
    </div>
    <p v-else class="empty">加载中...</p>
  </BlogWidget>
</template>

<style scoped>
.timeline {
  position: relative;
  font-size: 0.85em;
  padding: 0.5em 0;
}

.timeline::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--c-border);
  transform: translateX(-50%);
}

.day-group {
  position: relative;
  margin-bottom: 0.8em;
}

.date-badge {
  position: relative;
  z-index: 2;
  width: fit-content;
  margin: 0 auto 0.5em;
  padding: 0.15em 0.8em;
  background: var(--c-contrib-3, #30a14e);
  color: #fff;
  font-size: 0.75em;
  font-weight: 600;
  border-radius: 999px;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.timeline-entry {
  position: relative;
  width: 46%;
  margin-bottom: 0.35em;
}

.timeline-entry.left {
  margin-left: 0;
  margin-right: auto;
  text-align: right;
}

.timeline-entry.right {
  margin-left: auto;
  margin-right: 0;
  text-align: left;
}

.entry-dot {
  position: absolute;
  top: 1em;
  width: 11px; height: 11px;
  border-radius: 50%;
  background: var(--c-contrib-3, #30a14e);
  border: 2px solid var(--c-bg);
  z-index: 2;
}

.timeline-entry.left .entry-dot {
  right: -0.45em;
  transform: translateX(50%);
}

.timeline-entry.right .entry-dot {
  left: -0.45em;
  transform: translateX(-50%);
}

.entry-card {
  display: flex;
  gap: 0.4em;
  padding: 0.35em;
  border-radius: 6px;
  background: var(--c-bg-secondary, rgba(127,127,127,0.04));
  border: 1px solid var(--c-border);
  text-decoration: none;
  color: inherit;
  transition: background 0.12s, border-color 0.12s;
}

.timeline-entry.left .entry-card {
  flex-direction: row-reverse;
}

.entry-card:hover {
  background: var(--c-bg-secondary, rgba(127,127,127,0.1));
  border-color: var(--c-text-3);
}

.entry-cover {
  width: 56px; height: 38px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-border);
  font-size: 0.9em;
}

.entry-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.05em;
}

.timeline-entry.left .entry-info {
  align-items: flex-end;
}

.entry-title {
  font-size: 0.85em;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-desc {
  font-size: 0.72em;
  color: var(--c-text-secondary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: 0.3em;
  margin-top: 0.05em;
}

.timeline-entry.left .entry-meta {
  justify-content: flex-end;
}

.entry-cat {
  font-size: 0.62em;
  color: var(--c-text-3);
  background: var(--c-bg-secondary, rgba(127,127,127,0.1));
  padding: 0.05em 0.3em;
  border-radius: 3px;
}

.entry-time {
  font-size: 0.62em;
  color: var(--c-text-3);
}

.empty {
  opacity: 0.5;
  padding: 0.2em 0;
}
</style>