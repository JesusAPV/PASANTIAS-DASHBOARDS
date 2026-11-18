<script setup>
import { computed } from 'vue';
import { formatNumber, formatPercentage } from '../lib/format.js';
import SectionHeading from '../components/ui/SectionHeading.vue';
import MetricCard from '../components/ui/MetricCard.vue';

const props = defineProps({ data: { type: Object, required: true }, seccion: { type: String, required: true } });

/** Definición de cada sección de métricas: encabezado, grilla y tarjetas. */
const DEFINICIONES = {
  interacciones: {
    title: 'Métricas de las interacciones', subtitle: 'Comparación de los últimos tres meses.', source: 'Interacciones SIN ADS · archivo', grid: 'interaction-grid',
    cards: [
      ['Me gusta', 'meGusta', 'interacciones.likes'], ['Comentarios', 'comentarios', 'interacciones.comments'], ['Compartidos', 'compartidos', 'interacciones.shares'],
      ['Guardados', 'guardados', 'interacciones.saves'], ['Reposteos', 'reposteos', 'interacciones.reposts'],
    ],
  },
  publicaciones: {
    title: 'Métricas generales de las publicaciones', subtitle: 'Impresiones y alcance.', source: 'Métricas SIN ADS · archivo', grid: 'grid g2',
    cards: [['Impresiones', 'impresionesPosts', 'publicaciones.impressions'], ['Alcance', 'alcancePosts', 'publicaciones.reach']],
  },
  'atraccion-engagement': {
    title: 'Atracción y Engagement', subtitle: 'Visitas al perfil y engagement.', source: 'Métricas SIN ADS · archivo', grid: 'grid g2',
    cards: [['Visitas al perfil', 'visitasPerfil', 'publicaciones.profileViews'], ['Engagement', 'engagement', 'publicaciones.engagement', 'percentage']],
  },
  reels: {
    title: 'Métricas generales de los Reels', subtitle: 'Rendimiento de reproducciones y alcance.', source: 'Métricas Reels SIN ADS · archivo', grid: 'grid g2',
    cards: [['Total de reproducciones', 'reproduccionesReels', 'reels.plays'], ['Alcance', 'alcanceReels', 'reels.reach']],
  },
  historias: {
    title: 'Métricas de las historias', subtitle: 'Impresiones, alcance e historias publicadas.', source: 'Métricas ST · archivo', grid: 'grid g3',
    cards: [['Impresiones', 'impresionesHistorias', 'historias.impressions'], ['Alcance', 'alcanceHistorias', 'historias.reach'], ['Historias publicadas', 'historiasCount', 'historias.count']],
  },
};

const def = computed(() => DEFINICIONES[props.seccion] ?? DEFINICIONES.interacciones);

const columnasPubs = [
  { name: 'n', label: '#', field: 'n', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'meGusta', label: 'Me gusta', field: (r) => formatNumber(r.metricas.meGusta), align: 'right' },
  { name: 'comentarios', label: 'Comentarios', field: (r) => formatNumber(r.metricas.comentarios), align: 'right' },
  { name: 'compartidos', label: 'Compartidos', field: (r) => formatNumber(r.metricas.compartidos), align: 'right' },
  { name: 'guardados', label: 'Guardados', field: (r) => formatNumber(r.metricas.guardados), align: 'right' },
  { name: 'alcance', label: 'Alcance', field: (r) => formatNumber(r.metricas.alcance), align: 'right' },
  { name: 'reproducciones', label: 'Reproducciones', field: (r) => formatNumber(r.metricas.reproducciones), align: 'right' },
  { name: 'engagement', label: 'Engagement', field: (r) => formatPercentage(r.metricas.engagement), align: 'right' },
];
const filasPubs = computed(() => props.data.publicaciones.map((p, i) => ({ ...p, n: i + 1 })));
</script>

<template>
  <SectionHeading :title="def.title" :subtitle="def.subtitle" :source="def.source" />
  <div :class="def.grid">
    <MetricCard
      v-for="[title, serie, noteKey, format] in def.cards" :key="noteKey"
      :title="title" :values="data.series[serie]" :labels="data.series.labels" :note-key="noteKey" :format="format ?? 'number'"
    />
  </div>
  <div v-if="seccion === 'publicaciones' && filasPubs.length" class="card section-gap">
    <h3>Detalle por publicación · {{ data.periodo?.mes }}</h3>
    <q-table flat dense :rows="filasPubs" :columns="columnasPubs" row-key="id" hide-pagination :rows-per-page-options="[0]" class="tabla-plana" />
  </div>
</template>
