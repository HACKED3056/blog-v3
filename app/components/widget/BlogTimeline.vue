<script setup lang="ts">
const { data: timeline } = useFetch("/api/timeline")

const expanded = ref<Set<string>>(new Set())

function toggleDay(date: string) {
  if (expanded.value.has(date)) {
    expanded.value.delete(date)
  } else {
    expanded.value.add(date)
    // Force reactivity by creating new Set
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
        <button class="day-header" @click="toggleDay(day.date)">
          <div class="day-dot" />
          <span class="day-label">{{ dateLabel(day.date) }}</span>
          <span class="day-count">{{ day.entries.length }} 篇</span>
          <span class="expand-icon">{{ expanded.has(day.date) ? "−" : "+" }}</span>
        </button>
        <Transition name="fade">
          <div v-if="expanded.has(day.date)" class="day-entries">
            <UtilLink
              v-for="entry in day.entries"
              :key="entry.path"
              class="entry-card"
              :to="entry.path"
            >
              <NuxtImg
                v-if="entry.image"
                class="entry-cover"
                :src="entry.image"
                loading="lazy"
                referrerpolicy="no-referrer"
                alt=""
              />
              <div v-else class="entry-cover entry-cover-fallback">
                <span class="cover-icon">📄</span>
              </div>
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
      </div>
    </div>
    <p v-else class="empty">加载中...</p>
  </BlogWidget>
</template>

<style scoped>
.timeline {
  font-size: 0.85em;
}

.day-group {
  position: relative;
  padding-left: 1.5em;
}

/* Vertical line */
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

.day-group:last-child::before {
  display: none;
}

.day-header {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.3em;
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3em 0;
  width: 100%;
  text-align: left;
  color: inherit;
  border-radius: 4px;
}

.day-header:hover {
  background: var(--c-bg-secondary, rgba(127,127,127,0.06));
}

.day-dot {
  position: absolute;
  left: -1.25em;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--c-contrib-3, #30a14e);
  border: 3px solid var(--c-bg);
  z-index: 1;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.day-header:hover .day-dot {
  transform: translateY(-50%) scale(1.25);
}

.day-label {
  font-weight: 600;
  font-size: 1em;
  color: var(--c-text);
}

.day-count {
  font-size: 0.78em;
  color: var(--c-text-secondary);
  flex: 1;
}

.expand-icon {
  font-size: 1.1em;
  font-weight: 700;
  color: var(--c-text-3);
  width: 1.2em;
  height: 1.2em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: background 0.15s;
}

.day-header:hover .expand-icon {
  background: var(--c-bg-secondary, rgba(127,127,127,0.1));
}

.day-entries {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
  margin-bottom: 0.8em;
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
  width: 68px;
  height: 44px;
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

.cover-icon {
  font-size: 1.1em;
}

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

.entry-time {
  font-size: 0.68em;
  color: var(--c-text-3);
}

/* Transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.empty {
  opacity: 0.5;
  padding: 0.2em 0;
}
</style>