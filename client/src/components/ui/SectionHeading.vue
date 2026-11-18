<script setup>
defineProps({ title: { type: String, required: true }, subtitle: { type: String, default: '' }, source: { type: String, default: '' } });
</script>

<template>
  <div class="section-title">
    <div><h2>{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p></div>
    <div v-if="source" class="source-note">{{ source }}</div>
  </div>
</template>
