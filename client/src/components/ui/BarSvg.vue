<script setup>
import { computed } from 'vue';
import { formatNumber, formatPercentage } from '../../lib/format.js';

const props = defineProps({
  values: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  format: { type: String, default: 'number' },
  title: { type: String, default: '' },
});

/** Misma geometría que el gráfico SVG del dashboard original. */
const bars = computed(() => {
  const safe = props.values.map((v) => v ?? 0);
  const max = Math.max(...safe.map((v) => Math.abs(v)), 1);
  const count = Math.max(safe.length, 1);
  const slot = 100 / count;
  const barWidth = Math.min(11, slot * 0.44);
  return safe.map((value, index) => {
    const height = Math.max(2, (Math.abs(value) / max) * 72);
    const x = slot * index + (slot - barWidth) / 2;
    const y = 92 - height;
    return {
      key: index, x: `${x}%`, y, height, width: `${barWidth}%`, center: `${x + barWidth / 2}%`,
      textY: Math.max(14, y - 4), current: index === safe.length - 1,
      display: props.format === 'percentage' ? formatPercentage(value, 2) : formatNumber(value, Number.isInteger(value) ? 0 : 1),
      label: props.labels[index] ?? '',
    };
  });
});
</script>

<template>
  <svg class="bar-svg" role="img" :aria-label="title">
    <g v-for="b in bars" :key="b.key">
      <text class="bar-svg-value" :x="b.center" :y="b.textY">{{ b.display }}</text>
      <rect class="bar-svg-rect" :class="{ current: b.current }" :x="b.x" :y="b.y" :width="b.width" :height="b.height" rx="4" />
      <text class="bar-svg-label" :x="b.center" y="116">{{ b.label }}</text>
    </g>
  </svg>
</template>
