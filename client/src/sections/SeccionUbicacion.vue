<script setup>
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useDashboardStore } from '../stores/dashboard.js';
import { formatPercentage } from '../lib/format.js';
import SectionHeading from '../components/ui/SectionHeading.vue';
import ChartNote from '../components/ui/ChartNote.vue';

defineProps({ data: { type: Object, required: true } });
const store = useDashboardStore();
const $q = useQuasar();

const TABLAS = [
  { tipo: 'PAIS', titulo: 'Países', campo: 'paises', etiqueta: 'País' },
  { tipo: 'CIUDAD', titulo: 'Ciudades', campo: 'ciudades', etiqueta: 'Ciudad' },
];

/** Filas en edición por tipo (null = modo lectura). */
const edicion = ref({ PAIS: null, CIUDAD: null });
const guardando = ref({});

function editar(t, filas) {
  edicion.value[t.tipo] = filas.map((f) => ({ nombre: f.nombre, porcentaje: f.porcentaje }));
}
async function guardar(t) {
  const filas = edicion.value[t.tipo].filter((f) => String(f.nombre).trim()).map((f) => ({ nombre: String(f.nombre).trim(), porcentaje: Number(f.porcentaje) || 0 }));
  guardando.value[t.tipo] = true;
  try {
    await store.guardarUbicaciones(t.tipo, filas);
    edicion.value[t.tipo] = null;
    $q.notify({ type: 'positive', message: `${t.titulo} guardados.` });
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message });
  } finally {
    guardando.value[t.tipo] = false;
  }
}
</script>

<template>
  <SectionHeading title="Ubicación de los seguidores" subtitle="Países y ciudades con mayor participación." source="Carga manual" />
  <div class="twotables">
    <div v-for="t in TABLAS" :key="t.tipo" class="card">
      <h3>{{ t.titulo }} <span class="badge manual">Manual</span></h3>

      <template v-if="edicion[t.tipo]">
        <div v-for="(fila, i) in edicion[t.tipo]" :key="i" class="row q-col-gutter-sm items-center q-mb-xs">
          <div class="col-7"><q-input v-model="fila.nombre" dense outlined :placeholder="t.etiqueta" /></div>
          <div class="col-4"><q-input v-model.number="fila.porcentaje" dense outlined type="number" min="0" max="100" step="0.01" suffix="%" /></div>
          <div class="col-1"><q-btn flat round dense icon="close" color="negative" aria-label="Quitar" @click="edicion[t.tipo].splice(i, 1)" /></div>
        </div>
        <div class="table-actions">
          <q-btn flat dense icon="add" label="Fila" @click="edicion[t.tipo].push({ nombre: '', porcentaje: 0 })" />
          <q-btn unelevated dense color="primary" label="Guardar" :loading="guardando[t.tipo]" @click="guardar(t)" />
          <q-btn flat dense label="Cancelar" @click="edicion[t.tipo] = null" />
        </div>
      </template>

      <template v-else>
        <table class="datatable">
          <thead><tr><th>{{ t.etiqueta }}</th><th>%</th></tr></thead>
          <tbody>
            <tr v-if="!data.editorial.ubicaciones[t.campo].length"><td colspan="2"><p class="narrative">Sin registros.</p></td></tr>
            <tr v-for="f in data.editorial.ubicaciones[t.campo]" :key="f.id"><td>{{ f.nombre }}</td><td>{{ formatPercentage(f.porcentaje) }}</td></tr>
          </tbody>
        </table>
        <div v-if="store.editable" class="table-actions">
          <q-btn flat dense icon="edit" label="Editar" @click="editar(t, data.editorial.ubicaciones[t.campo])" />
        </div>
      </template>
    </div>
  </div>
  <div class="card section-gap"><h3>Lectura</h3><ChartNote note-key="ubicacion.lectura" /></div>
</template>
