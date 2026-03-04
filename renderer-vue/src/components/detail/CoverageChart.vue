<template>
  <div class="detail-coverage-chart relative" :style="{ height: height + 'px' }">
    <svg class="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none" @mouseleave="hoveredPoint = null">
      <defs>
        <linearGradient id="detail-coverage-fill" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0%" stop-color="rgb(var(--rm-accent))" stop-opacity="0.2" />
          <stop offset="100%" stop-color="rgb(var(--rm-accent))" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path
        v-if="chartPath"
        :d="chartPath"
        fill="url(#detail-coverage-fill)"
        stroke="rgb(var(--rm-accent))"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <g
        v-for="(pt, i) in points"
        :key="i"
        class="detail-coverage-point-group"
        :class="{ 'cursor-pointer': pt.commitSha }"
        @mouseenter="(e) => setHoveredPoint(e, pt)"
        @mouseleave="hoveredPoint = null"
        @click="onPointClick(pt)"
      >
        <svg
          :x="pt.x - 6"
          :y="pt.y - 6"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          preserveAspectRatio="xMidYMid meet"
          overflow="visible"
          class="detail-coverage-dot-svg"
        >
          <circle
            cx="6"
            cy="6"
            :r="hoveredPoint === pt ? 4 : 2.5"
            fill="rgb(var(--rm-surface))"
            stroke="rgb(var(--rm-accent))"
            stroke-width="1.2"
            class="detail-coverage-dot"
            :class="{ 'detail-coverage-dot-hover': hoveredPoint === pt }"
          />
        </svg>
      </g>
    </svg>
    <div
      v-if="hoveredPoint"
      class="detail-coverage-tooltip fixed z-[100] py-2 px-3 rounded-rm border border-rm-border bg-rm-surface shadow-lg text-xs text-rm-text pointer-events-none"
      :style="tooltipStyle"
    >
      <div class="font-mono font-semibold text-rm-accent">{{ hoveredPoint.percent }}%</div>
      <div class="text-rm-muted mt-0.5">{{ formatDate(hoveredPoint.date) }}</div>
      <div v-if="hoveredPoint.branch" class="text-rm-muted text-[11px]">{{ hoveredPoint.branch }}</div>
      <div v-if="hoveredPoint.commitSubject" class="mt-1 max-w-[16rem] truncate text-rm-muted" :title="hoveredPoint.commitSubject">{{ hoveredPoint.commitSubject }}</div>
      <div v-if="hoveredPoint.commitSha" class="mt-1.5 text-rm-accent">Click to view commit</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { formatDate as formatDateUtil } from '../../utils/formatDate';

const props = defineProps({
  /** Chart points: { x, y, date, percent, branch, commitSha, commitSubject }[] */
  points: { type: Array, default: () => [] },
  height: { type: Number, default: 120 },
});

const emit = defineEmits(['point-click']);

const hoveredPoint = ref(null);
const tooltipX = ref(0);
const tooltipY = ref(0);

function formatDate(isoDate) {
  return formatDateUtil(isoDate);
}

const chartPath = computed(() => {
  const pts = props.points;
  if (pts.length < 2) return '';
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const bottom = 112;
  return `${d} L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`;
});

const tooltipStyle = computed(() => ({
  left: `${tooltipX.value}px`,
  top: `${tooltipY.value}px`,
}));

function setHoveredPoint(e, pt) {
  hoveredPoint.value = pt;
  const offset = 12;
  tooltipX.value = e.clientX + offset;
  tooltipY.value = e.clientY + offset;
}

function onPointClick(pt) {
  if (pt.commitSha) emit('point-click', pt);
}
</script>
