<script setup>
import BarSvg from './BarSvg.vue';
import ChartNote from './ChartNote.vue';

defineProps({
  title: { type: String, required: true },
  values: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  noteKey: { type: String, required: true },
  format: { type: String, default: 'number' },
});
</script>

<template>
  <div class="card">
    <div class="splithead"><h3>{{ title }}</h3></div>
    <BarSvg :values="values" :labels="labels" :format="format" :title="title" />
    <ChartNote :note-key="noteKey" />
  </div>
</template>
