<script setup>
import { computed } from 'vue';
import { useDashboardStore } from '../stores/dashboard.js';
import { formatNumber, formatSigned, last, prev } from '../lib/format.js';
import SectionHeading from '../components/ui/SectionHeading.vue';
import KpiCard from '../components/ui/KpiCard.vue';
import ChartNote from '../components/ui/ChartNote.vue';

const props = defineProps({ data: { type: Object, required: true } });
const store = useDashboardStore();
const c = computed(() => props.data.cuenta ?? {});
const s = computed(() => props.data.series);
const meta = computed(() => c.value.meta ?? 0);
const seguidores = computed(() => c.value.seguidores ?? 0);
const progreso = computed(() => (meta.value ? Math.min(100, (seguidores.value / meta.value) * 100) : 0));
</script>

<template>
  <SectionHeading title="Resumen ejecutivo" subtitle="Una lectura rápida del mes antes de entrar al detalle." source="Mixto: archivo + campos manuales" />
  <div class="hero-summary">
    <div class="card account-block">
      <h3>ESTADO DE LA CUENTA</h3>
      <div class="account-number">{{ formatNumber(seguidores) }}</div>
      <div class="account-sub">seguidores · {{ formatSigned(c.variacion) }} en {{ data.periodo?.mes ?? '—' }}</div>
      <div class="progress"><progress max="100" :value="progreso" aria-label="Cumplimiento de la meta" /></div>
      <div class="mini-stats">
        <div class="mini-stat"><b>{{ formatNumber(meta) }}</b><span>Meta seguidores</span></div>
        <div class="mini-stat"><b>{{ formatNumber(Math.max(0, meta - seguidores)) }}</b><span>Faltan para la meta</span></div>
        <div class="mini-stat"><b>{{ formatNumber(c.publicaciones) }}</b><span>Publicaciones</span></div>
      </div>
    </div>
    <div class="card">
      <h3>Lectura del mes</h3>
      <ChartNote v-if="store.editable" note-key="estado.seguidores" />
      <p v-else class="narrative preserve-lines">{{ store.notas['estado.seguidores'] || 'Sin lectura registrada para este mes.' }}</p>
    </div>
  </div>
  <div class="grid g4 section-gap">
    <KpiCard label="Me gusta" :value="formatNumber(last(s.meGusta))" :foot="`vs ${formatNumber(prev(s.meGusta))} mes anterior`" />
    <KpiCard label="Compartidos" :value="formatNumber(last(s.compartidos))" :foot="`vs ${formatNumber(prev(s.compartidos))} mes anterior`" />
    <KpiCard label="Reproducciones Reel" :value="formatNumber(last(s.reproduccionesReels))" foot="Total del mes" />
    <KpiCard label="Visitas al perfil" :value="formatNumber(last(s.visitasPerfil))" foot="Total del mes" />
  </div>
</template>
