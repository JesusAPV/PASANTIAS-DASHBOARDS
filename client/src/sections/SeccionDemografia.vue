<script setup>
import { computed } from 'vue';
import { formatPercentage } from '../lib/format.js';
import SectionHeading from '../components/ui/SectionHeading.vue';
import BarSvg from '../components/ui/BarSvg.vue';
import ChartNote from '../components/ui/ChartNote.vue';

const props = defineProps({ data: { type: Object, required: true } });

const CLASES = { Masculino: 'male', Femenino: 'female', Desconocido: 'unknown' };
const ORDEN = ['Masculino', 'Femenino', 'Desconocido'];

const sexo = computed(() => [...props.data.demografia.sexo].sort((a, b) => ORDEN.indexOf(a.segmento) - ORDEN.indexOf(b.segmento)));
const edad = computed(() => props.data.demografia.edad);

function punto(p) {
  const a = (p * 3.6 - 90) * (Math.PI / 180);
  return { x: 50 + 42 * Math.cos(a), y: 50 + 42 * Math.sin(a) };
}
function arco(inicio, fin) {
  const s = punto(inicio); const e = punto(fin);
  return `M ${s.x.toFixed(4)} ${s.y.toFixed(4)} A 42 42 0 ${fin - inicio > 50 ? 1 : 0} 1 ${e.x.toFixed(4)} ${e.y.toFixed(4)}`;
}

/** Segmentos del gráfico circular (arcos abiertos, como el original). */
const segmentos = computed(() => {
  const total = sexo.value.reduce((s, v) => s + v.porcentaje, 0) || 100;
  let offset = 0;
  return sexo.value.map((item) => {
    const pct = (item.porcentaje / total) * 100;
    const seg = { key: item.segmento, cls: `donut-segment ${CLASES[item.segmento] ?? 'unknown'}`, full: pct >= 99.999, d: pct > 0 && pct < 99.999 ? arco(offset, offset + pct) : null };
    offset += pct;
    return seg;
  });
});

const lectura = computed(() => {
  const get = (n) => sexo.value.find((s) => s.segmento === n)?.porcentaje ?? 0;
  const topG = [...sexo.value].sort((a, b) => b.porcentaje - a.porcentaje)[0];
  const topE = [...edad.value].sort((a, b) => b.porcentaje - a.porcentaje)[0];
  if (!topG || !topE) return 'Sin datos demográficos para este período.';
  const m = get('Masculino'); const f = get('Femenino'); const u = get('Desconocido');
  const g = u >= 25 ? 'Una parte considerable de la audiencia no tiene género identificado'
    : f >= m + 10 ? 'La audiencia presenta una composición predominantemente femenina'
      : m >= f + 10 ? 'La audiencia presenta una composición predominantemente masculina'
        : 'La distribución por género se mantiene relativamente equilibrada';
  const e = ['13-17', '18-24'].includes(topE.segmento) ? 'el mayor peso se concentra en una audiencia joven'
    : topE.segmento === '25-34' ? 'el mayor peso se concentra en adultos jóvenes'
      : topE.segmento === '35-44' ? 'el mayor peso se concentra en una audiencia adulta'
        : 'el mayor peso se concentra en una audiencia madura';
  return `${g}: ${topG.segmento} representa ${formatPercentage(topG.porcentaje)}. Por edad, ${e}; el segmento ${topE.segmento} reúne ${formatPercentage(topE.porcentaje)}.`;
});
</script>

<template>
  <SectionHeading title="Demografía de los seguidores" subtitle="Distribución por género y edad." source="Sexo y edad · archivo" />
  <div class="demo">
    <div class="card demographic-card">
      <h3>Género</h3>
      <div class="donut-wrap">
        <svg class="donut-svg" viewBox="0 0 100 100" role="img" aria-label="Distribución por género">
          <circle class="donut-track" cx="50" cy="50" r="42" />
          <template v-for="seg in segmentos" :key="seg.key">
            <circle v-if="seg.full" :class="seg.cls" cx="50" cy="50" r="42" />
            <path v-else-if="seg.d" :class="seg.cls" :d="seg.d" />
          </template>
        </svg>
        <div class="legend">
          <div v-for="s in sexo" :key="s.segmento" class="legend-row"><i class="dot" :class="CLASES[s.segmento] ?? 'unknown'" /><span>{{ s.segmento }}</span><b>{{ formatPercentage(s.porcentaje) }}</b></div>
        </div>
      </div>
      <ChartNote note-key="demografia.genero" />
    </div>
    <div class="card demographic-card">
      <h3>Edad</h3>
      <BarSvg :values="edad.map((e) => e.porcentaje)" :labels="edad.map((e) => e.segmento)" format="percentage" title="Distribución por edad" />
      <ChartNote note-key="demografia.edad" />
    </div>
  </div>
  <div class="card section-gap"><h3>Lectura automática</h3><p class="narrative">{{ lectura }}</p></div>
</template>
