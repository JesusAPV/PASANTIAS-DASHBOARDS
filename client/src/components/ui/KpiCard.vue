<script setup>
defineProps({ label: String, value: [String, Number], foot: { type: String, default: '' }, source: { type: String, default: 'excel' } });
</script>

<template>
  <div class="card kpi">
    <div class="label">{{ label }}</div>
    <div class="value">{{ value }}</div>
    <div class="foot">
      <span>{{ foot }}</span>
      <span class="badge" :class="source === 'excel' ? '' : source">{{ source === 'manual' ? 'Manual' : source === 'image' ? 'Imagen' : 'Excel' }}</span>
    </div>
  </div>
</template>
