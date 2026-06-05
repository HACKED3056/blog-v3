<script setup lang="ts">
const { data: timeline } = useFetch("/api/timeline")

function dateLabel(d: string) {
  if (!d) return ""
  const p = d.split("-")
  return p[0] + "." + p[1] + "." + p[2]
}

function catColor(cat: string) {
  const m: Record<string, string> = {
    pwn: "#30a14e", "安全": "#40c463", "比赛": "#196127", "技术": "#9be9a8"
  }
  return m[cat] || "#ccc"
}
</script>

<template>
  <BlogWidget card title="写作时间线">
    <div v-if="timeline && timeline.length" class="timeline">
      <div v-for="(day, di) in timeline" :key="day.date">
        <div class="date-badge">{{ dateLabel(day.date) }}</div>
        <div v-for="(entry, ei) in day.entries" :key="entry.path" class="row">
          <!-- Left card -->
          <UtilLink v-if="(di + ei) % 2 === 0" :to="entry.path" class="card left">
            <NuxtImg v-if="entry.image" class="cover" :src="entry.image" loading="lazy" referrerpolicy="no-referrer" alt="" />
            <div v-else class="cover fallback">📄</div>
            <div class="info">
              <div class="title">{{ entry.title }}</div>
              <div v-if="entry.desc" class="desc">{{ entry.desc }}</div>
              <div class="meta">
                <span class="cat">{{ entry.category }}</span>
                <span class="time">{{ entry.readingTime }}</span>
              </div>
            </div>
          </UtilLink>

          <!-- Dot on the line -->
          <div class="dot" :style="{ background: catColor(entry.category) }" />

          <!-- Right card -->
          <UtilLink v-if="(di + ei) % 2 !== 0" :to="entry.path" class="card right">
            <NuxtImg v-if="entry.image" class="cover" :src="entry.image" loading="lazy" referrerpolicy="no-referrer" alt="" />
            <div v-else class="cover fallback">📄</div>
            <div class="info">
              <div class="title">{{ entry.title }}</div>
              <div v-if="entry.desc" class="desc">{{ entry.desc }}</div>
              <div class="meta">
                <span class="cat">{{ entry.category }}</span>
                <span class="time">{{ entry.readingTime }}</span>
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
  top: 0; bottom: 0;
  width: 2px;
  background: var(--c-border);
  transform: translateX(-50%);
}

.date-badge {
  position: relative;
  z-index: 3;
  width: fit-content;
  margin: 0 auto 0.5em;
  padding: 0.15em 0.8em;
  background: var(--c-contrib-3, #30a14e);
  color: #fff;
  font-size: 0.75em;
  font-weight: 600;
  border-radius: 999px;
}

/* Each row = one entry + dot on the line */
.row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.35em;
  position: relative;
}

.dot {
  position: absolute;
  left: 50%;
  top: 0.7em;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid var(--c-bg);
  z-index: 2;
  transform: translateX(-50%);
  flex-shrink: 0;
}

.card {
  display: flex;
  gap: 0.4em;
  padding: 0.35em;
  border-radius: 6px;
  background: var(--c-bg-secondary, rgba(127,127,127,0.04));
  border: 1px solid var(--c-border);
  text-decoration: none;
  color: inherit;
  transition: background 0.12s, border-color 0.12s;
  width: 46%;
}

.card:hover {
  background: var(--c-bg-secondary, rgba(127,127,127,0.1));
  border-color: var(--c-text-3);
}

.card.left {
  margin-right: auto;
  text-align: left;
}

.card.right {
  margin-left: auto;
  text-align: left;
  flex-direction: row-reverse;
}

.card.right .info {
  align-items: flex-end;
  text-align: right;
}

.cover {
  width: 56px;
  height: 38px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-border);
  font-size: 0.9em;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.05em;
}

.title {
  font-size: 0.85em;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desc {
  font-size: 0.72em;
  color: var(--c-text-secondary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.3em;
  margin-top: 0.05em;
}

.card.right .meta {
  justify-content: flex-end;
}

.cat {
  font-size: 0.62em;
  color: var(--c-text-3);
  background: var(--c-bg-secondary, rgba(127,127,127,0.1));
  padding: 0.05em 0.3em;
  border-radius: 3px;
}

.time {
  font-size: 0.62em;
  color: var(--c-text-3);
}

.empty { opacity: 0.5; padding: 0.2em 0; }
</style>