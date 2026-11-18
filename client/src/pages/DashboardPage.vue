<script setup>
import { computed, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { useDashboardStore } from '../stores/dashboard.js';
import { seccionesDeMarca } from '../lib/secciones.js';
import AppLayout from '../layouts/AppLayout.vue';
import SeccionResumen from '../sections/SeccionResumen.vue';
import SeccionGlosario from '../sections/SeccionGlosario.vue';
import SeccionEstado from '../sections/SeccionEstado.vue';
import SeccionDestacadas from '../sections/SeccionDestacadas.vue';
import SeccionDemografia from '../sections/SeccionDemografia.vue';
import SeccionUbicacion from '../sections/SeccionUbicacion.vue';
import SeccionMetricas from '../sections/SeccionMetricas.vue';
import SeccionCompetencia from '../sections/SeccionCompetencia.vue';
import SeccionComunicaciones from '../sections/SeccionComunicaciones.vue';
import SeccionConclusiones from '../sections/SeccionConclusiones.vue';

const auth = useAuthStore();
const store = useDashboardStore();
const route = useRoute();
const router = useRouter();

const marca = computed(() => auth.marcas.find((m) => m.clave === route.params.clave));
const secciones = computed(() => seccionesDeMarca(marca.value?.secciones));
const sec = computed(() => route.query.sec ?? secciones.value[0]?.id ?? 'resumen');
const data = computed(() => store.data);

const subtitle = computed(() => {
  if (store.error) return store.error;
  if (data.value?.periodo) return `${data.value.periodo.label} · Instagram Analytics`;
  return store.cargando ? 'Cargando datos…' : 'Sin datos cargados para esta marca';
});

watch([marca, () => route.query.periodo], ([m, periodo]) => {
  if (!m) {
    if (auth.marcas.length) router.replace({ name: 'marca', params: { clave: auth.marcas[0].clave } });
    return;
  }
  store.abrir(m.id, typeof periodo === 'string' ? periodo : undefined);
}, { immediate: true });
onBeforeUnmount(() => store.cerrar());

const opcionesPeriodo = computed(() => (data.value?.periodos ?? []).map((p) => ({ label: p.label, value: p.key })));
function cambiarPeriodo(key) { router.replace({ query: { ...route.query, periodo: key } }); }

const COMPONENTES = {
  resumen: SeccionResumen, glosario: SeccionGlosario, estado: SeccionEstado, destacadas: SeccionDestacadas,
  demografia: SeccionDemografia, ubicacion: SeccionUbicacion, competencia: SeccionCompetencia,
  comunicaciones: SeccionComunicaciones, conclusiones: SeccionConclusiones,
};
const componente = computed(() => COMPONENTES[sec.value] ?? SeccionMetricas);
</script>

<template>
  <AppLayout v-if="marca" :title="`${marca.nombre} · Reporte mensual`" :subtitle="subtitle" :marca="marca">
    <div v-if="data && data.periodos.length > 1" class="period-bar">
      <q-select
        :model-value="data.periodo?.key" :options="opcionesPeriodo" emit-value map-options dense outlined
        label="Período" class="period-select" @update:model-value="cambiarPeriodo"
      />
    </div>

    <div v-if="store.cargando" class="card"><p class="narrative">Cargando dashboard…</p></div>
    <div v-else-if="store.error" class="card error-card">{{ store.error }}</div>
    <div v-else-if="data && !data.cuenta" class="card error-card">
      Todavía no hay métricas para {{ marca.nombre }}.
      {{ auth.puedeEditar ? 'Carga el archivo mensual desde "Cargar archivos".' : 'El administrador aún no ha cargado el reporte.' }}
    </div>
    <section v-else-if="data" class="section active" :id="sec">
      <component :is="componente" :data="data" :seccion="sec" />
    </section>
  </AppLayout>
  <AppLayout v-else title="Sin marcas asignadas" subtitle="Contacta al administrador.">
    <div class="card error-card">Tu usuario no tiene marcas visibles.</div>
  </AppLayout>
</template>
