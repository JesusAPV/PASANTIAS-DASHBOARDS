<script setup>
import { formatNumber, formatPercentage } from '../lib/format.js';
import SectionHeading from '../components/ui/SectionHeading.vue';
import ChartNote from '../components/ui/ChartNote.vue';

defineProps({ data: { type: Object, required: true } });

const TARJETAS = [
  ['Seguidores', 'seguidores', 'competencia.followers'], ['Publicaciones', 'publicaciones', 'competencia.posts'],
  ['Me gusta', 'meGusta', 'competencia.likes'], ['Comentarios', 'comentarios', 'competencia.comments'],
  ['Engagement', 'engagement', 'competencia.engagement', true],
];

const maximo = (rows) => Math.max(...rows.map((r) => r.valor ?? 0), 1);
const ancho = (v, rows) => `${Math.min(100, Math.max(0, ((v ?? 0) / maximo(rows)) * 100)).toFixed(1)}%`;
const valor = (v, pct) => (pct ? formatPercentage(v ?? 0) : formatNumber(v ?? 0, Number.isInteger(v ?? 0) ? 0 : 1));
</script>

<template>
  <SectionHeading title="Competencia" subtitle="Comparación del mes con las principales cuentas de referencia." source="Competidores · archivo" />
  <div class="competition">
    <div v-for="[title, campo, noteKey, pct] in TARJETAS" :key="noteKey" class="card">
      <h3>{{ title }}</h3>
      <div class="rank">
        <p v-if="!data.competencia[campo].length" class="narrative">Sin datos para esta marca.</p>
        <div v-for="r in data.competencia[campo]" :key="r.nombre" class="rank-row" :class="{ self: r.esPropia }">
          <span>{{ r.nombre }}</span>
          <div class="rank-track"><div class="rank-bar" :class="{ self: r.esPropia }" :style="{ width: ancho(r.valor, data.competencia[campo]) }" /></div>
          <b>{{ valor(r.valor, pct) }}</b>
        </div>
      </div>
      <ChartNote :note-key="noteKey" />
    </div>
  </div>
</template>
