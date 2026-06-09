<script setup lang="ts">
const { data: timeline } = useFetch("/api/timeline")

const expanded = ref<Set<string>>(new Set())

function toggleDay(date: string) {
  if (expanded.value.has(date)) {
    expanded.value.delete(date)
  } else {
    expanded.value.add(date)
    expanded.value = new Set(expanded.value)
  }
}

function dateLabel(d: string) {
  if (!d) return ""
  const parts = d.split("-")
  return parts[1] + "月" + parts[2] + "日"
}
</script>

<template>
  <BlogWidget card title="写作时间线">
    <div v-if="timeline && timeline.length" class="timeline">
      <div v-for="day in timeline" :key="day.date" class="day-group">
        <div class="day-header">
          <div class="day-dot" />
          <span class="day-label">{{ dateLabel(day.date) }}</span>
          <span class="day-count">{{ day.entries.length }} 篇</span>
        </div>
        <div class="day-entries">
          <!-- Show first 2 articles always -->
          <UtilLink
            v-for="entry in day.entries.slice(0, 2)"
            :key="entry.path"
            class="entry-card"
            :to="entry.path"
          >
            <NuxtImg v-if="entry.image" class="entry-cover" :src="entry.image" loading="lazy" referrerpolicy="no-referrer" alt="" />
            <div v-else class="entry-cover entry-cover-fallback"><span class="cover-icon">📄</span></div>
            <div class="entry-info">
              <div class="entry-title">{{ entry.title }}</div>
              <div v-if="entry.desc" class="entry-desc">{{ entry.desc }}</div>
              <div class="entry-meta">
                <span class="entry-cat">{{ entry.category }}</span>
                <span class="entry-time">{{ entry.readingTime }}</span>
              </div>
            </div>
          </UtilLink>

          <!-- Expandable: remaining articles -->
          <Transition name="fade">
            <div v-if="expanded.has(day.date)" class="extra-entries">
              <UtilLink
                v-for="entry in day.entries.slice(2)"
                :key="entry.path"
                class="entry-card"
                :to="entry.path"
              >
                <NuxtImg v-if="entry.image" class="entry-cover" :src="entry.image" loading="lazy" referrerpolicy="no-referrer" alt="" />
                <div v-else class="entry-cover entry-cover-fallback"><span class="cover-icon">📄</span></div>
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
          </Transition>

          <button
            v-if="day.entries.length > 2"
            class="show-more"
            @click="toggleDay(day.date)"
          >
            {{ expanded.has(day.date) ? "收起" : `展开其余 ${day.entries.length - 2} 篇` }}
          </button>
        </div>
      </div>
    </div>
    <p v-else class="empty">加载中...</p>
  </BlogWidget>
</template>

<style scoped>
.timeline { font-size: 0.85em; }

.day-group {
  position: relative;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}

.day-group::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 1.2em;
  bottom: 0;
  width: 2px;
  background: var(--c-border);
  border-radius: 1px;
}

.day-group:last-child::before { display: none; }

.day-header {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.4em;
  position: relative;
  padding: 0.2em 0;
}

.day-dot {
  position: absolute;
  left: -1.25em;
  top: 50%;
  transform: translateY(-50%);
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--c-contrib-3, #30a14e);
  border: 3px solid var(--c-bg);
  z-index: 1;
  flex-shrink: 0;
}

.day-label { font-weight: 600; font-size: 1em; color: var(--c-text); }
.day-count { font-size: 0.78em; color: var(--c-text-secondary); }

.day-entries {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
  margin-bottom: 0.6em;
  padding-left: 0.2em;
}

.entry-card {
  display: flex;
  gap: 0.6em;
  padding: 0.4em;
  border-radius: 8px;
  background: var(--c-bg-secondary, rgba(127,127,127,0.04));
  text-decoration: none;
  color: inherit;
  transition: background 0.12s, border-color 0.12s;
  border: 1px solid var(--c-border);
}

.entry-card:hover {
  background: var(--c-bg-secondary, rgba(127,127,127,0.1));
  border-color: var(--c-text-3);
}

.entry-cover {
  width: 140px; height: 88px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.entry-cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-border);
}

.cover-icon { font-size: 1.1em; }

.entry-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1em;
}

.entry-title {
  font-weight: 500;
  font-size: 0.9em;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-desc {
  font-size: 0.75em;
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
  margin-top: auto;
}

.entry-cat {
  font-size: 0.68em;
  color: var(--c-text-3);
  background: var(--c-bg-secondary, rgba(127,127,127,0.1));
  padding: 0.05em 0.3em;
  border-radius: 3px;
}

.entry-time { font-size: 0.68em; color: var(--c-text-3); }

.show-more {
  display: block;
  width: 100%;
  padding: 0.35em 0.6em;
  font-size: 0.78em;
  color: var(--c-text-secondary);
  background: var(--c-bg-secondary, rgba(127,127,127,0.03));
  border: 1px dashed var(--c-border);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, color 0.12s;
}

.show-more:hover {
  background: var(--c-bg-secondary, rgba(127,127,127,0.1));
  color: var(--c-text);
  border-style: solid;
}

.extra-entries {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to { opacity: 0; }

.empty { opacity: 0.5; padding: 0.2em 0; }
</style>
/* Mobile responsive */
@media (max-width: 640px) {
  .timeline { font-size: 0.8em; }

  .card { width: 80% !important; }

  .card.right { margin-left: 20% !important; }

  .row { margin-bottom: 0.5em; }

  .cover { width: 56px !important; height: 38px !important; }

  .date-badge { font-size: 0.65em; }
}
