<script setup lang="ts">
const currentYear = ref(2026)
const startYear = 2026

const { data, refresh } = useFetch('/api/contributions', {
  query: { year: currentYear },
  watch: false,
})

function prevYear() {
  if (currentYear.value > startYear) {
    currentYear.value--
    refresh()
  }
}

function nextYear() {
  currentYear.value++
  refresh()
}

const isFirstYear = computed(() => currentYear.value === startYear)
const isCurrentYear = computed(() => currentYear.value === new Date().getFullYear())

const dayLabels = ['', '周一', '', '周三', '', '周五', '']

const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const startDay = computed(() => {
  if (!data.value?.startDate) return 0
  const d = new Date(data.value.startDate)
  return d.getDay() // 0=Sun
})

const weeks = computed(() => data.value?.weeks ?? 53)

const monthLabels = computed(() => {
  if (!data.value?.contributions) return []
  const labels: { label: string; offset: number }[] = []
  let lastMonth = -1
  const sd = startDay.value
  data.value.contributions.forEach((c, i) => {
    const m = Number(c.date.split('-')[1])
    if (m !== lastMonth) {
      const weekIndex = Math.floor((i + sd) / 7)
      const name = monthNames[m - 1]
      if (labels.length === 0 || labels[labels.length - 1].label !== name) {
        labels.push({ label: name, offset: weekIndex })
      }
      lastMonth = m
    }
  })
  return labels
})

function tipText(cell: { date: string; count: number }) {
  return `${cell.date} · ${cell.count} 篇笔记`
}
</script>

<template>
  <BlogWidget card title="笔记贡献">
    <div v-if="data" class="contribution">
      <div class="total">
        <strong>{{ data.totalCount }}</strong> 篇笔记 · {{ data.year }} 年
      </div>

      <div class="year-nav">
        <button v-if="!isFirstYear" class="year-btn" @click="prevYear">◀</button>
        <span class="year-label">{{ currentYear }}</span>
        <button v-if="!isCurrentYear" class="year-btn" @click="nextYear">▶</button>
      </div>

      <div class="start-date">
        <div class="start-icon">📅</div>
        <div class="start-text">
          <span class="start-label">启程</span>
          <span class="start-value blur-hover">2026.05.17</span>
        </div>
      </div>

      <div
        class="graph"
        :style="{
          gridTemplateColumns: `var(--col-label, 2.2em) repeat(${weeks}, var(--cell-w, 14px))`,
          gridTemplateRows: `var(--row-label, 1.3em) repeat(7, var(--cell-h, 12px))`
        }"
      >
        <div class="months">
          <span
            v-for="m in monthLabels"
            :key="m.label"
            :style="{ gridColumn: m.offset + 2, gridRow: 1 }"
          >{{ m.label }}</span>
        </div>

        <div class="days">
          <span v-for="(label, i) in dayLabels" :key="i" :style="{ gridRow: i + 2 }">{{ label }}</span>
        </div>

        <div
          v-for="(cell, i) in data.contributions" :key="cell.date"
          v-tip="tipText(cell)"
          class="cell"
          :class="`level-${cell.level}`"
          :style="{ gridRow: ((i + startDay) % 7) + 2, gridColumn: Math.floor((i + startDay) / 7) + 2 }"
        />
      </div>

      <div class="legend">
        <span class="legend-label">少</span>
        <span class="cell level-0" />
        <span class="cell level-1" />
        <span class="cell level-2" />
        <span class="cell level-3" />
        <span class="cell level-4" />
        <span class="legend-label">多</span>
      </div>
    </div>
    <p v-else class="empty">获取贡献数据失败</p>
  </BlogWidget>
</template>

<style scoped>
.contribution {
  font-size: 0.75em;
  line-height: 1.4;
}

.total {
  margin-bottom: 0.5em;
  white-space: nowrap;
}

.graph {
  display: grid;
  gap: 2px;
  padding-bottom: 0.3em;
}

.months { display: contents; }

.months span {
  font-size: 0.65em;
  color: var(--c-text-secondary);
  text-align: left;
  line-height: 1.2em;
  white-space: nowrap;
}

.days { display: contents; }

.days span {
  font-size: 0.65em;
  color: var(--c-text-secondary);
  text-align: right;
  padding-right: 4px;
  line-height: 12px;
  white-space: nowrap;
}

.cell {
  background: transparent;
  width: 100%;
  height: 100%;
  border-radius: 2px;
  transition: transform 0.12s ease;
}

.cell:hover {
  transform: scale(1.35);
}

.cell.level-0 { background: var(--c-bg-secondary, rgba(127,127,127,0.1)); }
.cell.level-1 { background: var(--c-contrib-1, #9be9a8); }
.cell.level-2 { background: var(--c-contrib-2, #40c463); }
.cell.level-3 { background: var(--c-contrib-3, #30a14e); }
.cell.level-4 { background: var(--c-contrib-4, #196127); }

.legend {
  display: flex;
  align-items: center;
  gap: 3px;
  justify-content: flex-start;
  margin-top: 0.3em;
  font-size: 0.75em;
  color: var(--c-text-secondary);
}

.legend .cell {
  width: 12px;
  height: 12px;
}

.legend-label { font-size: 0.85em; }

.year-nav {
  display: flex;
  align-items: center;
  gap: 0.6em;
  margin-bottom: 0.6em;
}

.year-btn {
  background: none;
  border: 1px solid var(--c-border);
  border-radius: 4px;
  padding: 0.1em 0.4em;
  cursor: pointer;
  font-size: 0.85em;
  line-height: 1.4;
  color: var(--c-text);
}

.year-btn:hover:not(:disabled) {
}

.year-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.year-label {
  font-weight: 600;
  font-size: 1em;
  min-width: 3em;
  text-align: center;
}

.start-date {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin: 0.8em 0 0.3em;
  padding: 0.3em 0.6em;
  border-radius: 8px;
  background: var(--c-bg-secondary, rgba(127,127,127,0.04));
  border: 1px solid var(--c-border);
}

.start-icon {
  font-size: 1.5em;
  line-height: 1;
}

.start-text {
  display: flex;
  flex-direction: column;
  gap: 0.05em;
}

.start-label {
  font-size: 0.65em;
  color: var(--c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.start-value {
  font-size: 1em;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-2);
  transition: filter 0.25s ease;
  filter: blur(3px);
  cursor: default;
}

.start-value:hover {
  filter: blur(0);
}

.empty {
  opacity: 0.5;
  padding: 0.2em 0;
}
</style>
