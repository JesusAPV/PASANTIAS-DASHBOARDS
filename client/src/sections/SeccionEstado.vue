<script setup>
import { computed } from 'vue';
import { formatNumber, formatPercentage, formatSigned } from '../lib/format.js';
import SectionHeading from '../components/ui/SectionHeading.vue';
import KpiCard from '../components/ui/KpiCard.vue';
import BarSvg from '../components/ui/BarSvg.vue';
import ChartNote from '../components/ui/ChartNote.vue';

const props = defineProps({ data: { type: Object, required: true } });
const c = computed(() => props.data.cuenta ?? {});
const variacion = computed(() => c.value.variacion ?? 0);

const columnas = [
  { name: 'mes', label: 'Mes', field: 'mes', align: 'left' },
  { name: 'seguidores', label: 'Seguidores', field: (r) => formatNumber(r.seguidores), align: 'right' },
  { name: 'variacion', label: 'Variación', field: (r) => formatSigned(r.variacion), align: 'right' },
  { name: 'meGusta', label: 'Me gusta', field: (r) => formatNumber(r.meGusta), align: 'right' },
  { name: 'comentarios', label: 'Comentarios', field: (r) => formatNumber(r.comentarios), align: 'right' },
  { name: 'alcance', label: 'Alcance', field: (r) => formatNumber(r.alcancePosts), align: 'right' },
  { name: 'engagement', label: 'Engagement', field: (r) => formatPercentage(r.engagement), align: 'right' },
];
</script>

<template>
  <SectionHeading title="Estado de la cuenta" subtitle="Seguidores, crecimiento y cumplimiento de la meta." source="Seguidores · archivo" />
  <div class="grid g3">
    <KpiCard label="Seguidores actuales" :value="formatNumber(c.seguidores)" :foot="data.periodo?.label ?? ''" />
    <KpiCard label="Variación mensual" :value="formatSigned(variacion)" :foot="variacion >= 0 ? 'Crecimiento neto' : 'Variación neta'" />
    <KpiCard label="Meta" :value="formatNumber(c.meta)" foot="Objetivo configurado" />
  </div>
  <div class="card section-gap">
    <h3>Evolución reciente</h3>
    <BarSvg :values="data.series.seguidores" :labels="data.series.labels" title="Evolución de seguidores" />
    <ChartNote note-key="estado.evolucion" />
  </div>
  <div v-if="data.historico.length > 3" class="card section-gap">
    <h3>Histórico del año</h3>
    <q-table flat dense :rows="data.historico" :columns="columnas" row-key="periodo" hide-pagination :rows-per-page-options="[0]" class="tabla-plana" />
  </div>
</template>
