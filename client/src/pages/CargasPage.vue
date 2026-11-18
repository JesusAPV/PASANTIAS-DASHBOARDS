<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { formatBytes, formatDate, formatDateTime } from '../lib/format.js';
import AppLayout from '../layouts/AppLayout.vue';
import SectionHeading from '../components/ui/SectionHeading.vue';

const props = defineProps({ soloHistorial: { type: Boolean, default: false } });
const auth = useAuthStore();
const $q = useQuasar();

const marcaId = ref(auth.marcas[0]?.id ?? '');
const marca = computed(() => auth.marcas.find((m) => m.id === marcaId.value));
const opcionesMarca = computed(() => auth.marcas.map((m) => ({ label: `${m.cliente.nombre} · ${m.nombre}`, value: m.id })));

const anio = ref(new Date().getFullYear());
const archivos = ref([]);
const enviando = ref(false);
const resultado = ref(null);
const errorCarga = ref(null);
const plantilla = ref(null);
const cargas = ref([]);
const cargandoHistorial = ref(false);

const columnas = [
  { name: 'fecha', label: 'Fecha', field: (r) => formatDateTime(r.createdAt), align: 'left' },
  { name: 'archivo', label: 'Archivo', field: (r) => `${r.nombreArchivo} (${formatBytes(r.tamanoBytes)})`, align: 'left' },
  { name: 'formato', label: 'Formato', field: 'formato', align: 'left' },
  { name: 'periodo', label: 'Período', field: (r) => formatDate(r.periodo), align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
  { name: 'filas', label: 'Filas', field: 'filasInsertadas', align: 'right' },
  { name: 'duracion', label: 'Duración', field: (r) => (r.duracionMs != null ? `${r.duracionMs} ms` : '—'), align: 'right' },
  { name: 'usuario', label: 'Usuario', field: (r) => r.usuario?.username ?? '—', align: 'left' },
];

async function cargarHistorial() {
  if (!marcaId.value) return;
  cargandoHistorial.value = true;
  try { cargas.value = (await api(`/ingesta/${marcaId.value}`, { passive: true })).cargas; }
  catch (e) { $q.notify({ type: 'negative', message: e.message }); }
  finally { cargandoHistorial.value = false; }
}
watch(marcaId, () => { resultado.value = null; errorCarga.value = null; cargarHistorial(); }, { immediate: true });
onMounted(async () => { if (!props.soloHistorial) plantilla.value = await api('/ingesta/plantilla', { passive: true }).catch(() => null); });

async function procesar() {
  if (!archivos.value.length) return;
  enviando.value = true; errorCarga.value = null; resultado.value = null;
  try {
    const fd = new FormData();
    fd.append('anio', String(anio.value));
    archivos.value.forEach((f) => fd.append('archivos', f));
    resultado.value = await api(`/ingesta/${marcaId.value}`, { method: 'POST', body: fd });
    archivos.value = [];
    $q.notify({ type: 'positive', message: `Carga completada en ${resultado.value.duracionMs} ms.` });
    cargarHistorial();
  } catch (e) {
    errorCarga.value = { message: e.message, details: Array.isArray(e.details) ? e.details : null };
    cargarHistorial();
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <AppLayout :title="soloHistorial ? 'Historial de cargas' : 'Carga de archivos'" subtitle="Ingesta por lotes de reportes mensuales (XLSX o CSV)" :marca="marca">
    <div class="period-bar">
      <q-select v-model="marcaId" :options="opcionesMarca" emit-value map-options dense outlined label="Marca" class="period-select wide" />
    </div>

    <template v-if="!soloHistorial">
      <SectionHeading title="Nuevo reporte mensual" subtitle="Sube el libro XLSX completo o un CSV por cada hoja. El archivo se valida íntegro antes de guardar: si tiene errores, se rechaza completo." source="Solo Administrador" />
      <div class="card">
        <div class="row q-col-gutter-md items-start">
          <div class="col-12 col-md-3"><q-input v-model.number="anio" type="number" label="Año del reporte" outlined dense min="2020" max="2100" /></div>
          <div class="col-12 col-md-6">
            <q-file v-model="archivos" multiple use-chips outlined dense label="Archivo .xlsx o varios .csv" accept=".xlsx,.xls,.csv" counter>
              <template #prepend><q-icon name="attach_file" /></template>
            </q-file>
          </div>
          <div class="col-12 col-md-3">
            <q-btn unelevated color="primary" class="full-width" icon="cloud_upload" label="Procesar archivo" :loading="enviando" :disable="!archivos.length || !marcaId" @click="procesar" />
          </div>
        </div>

        <q-banner v-if="errorCarga" class="bg-red-1 text-negative q-mt-md" rounded>
          <template #avatar><q-icon name="error" color="negative" /></template>
          <b>{{ errorCarga.message }}</b>
          <ul v-if="errorCarga.details"><li v-for="d in errorCarga.details" :key="d">{{ d }}</li></ul>
        </q-banner>
        <q-banner v-if="resultado" class="bg-green-1 text-positive q-mt-md" rounded>
          <template #avatar><q-icon name="check_circle" color="positive" /></template>
          <b>Carga completada: {{ resultado.mesActual }} ({{ resultado.periodo }})</b>
          <p class="q-mb-none text-dark">
            {{ resultado.filasInsertadas }} registros en {{ resultado.duracionMs }} ms · meses: {{ resultado.resumen.meses }}, demografía: {{ resultado.resumen.demografia }},
            competidores: {{ resultado.resumen.competidores }}, publicaciones: {{ resultado.resumen.publicaciones }}, historias: {{ resultado.resumen.historias }}
          </p>
          <ul v-if="resultado.advertencias.length" class="text-dark"><li v-for="a in resultado.advertencias" :key="a">{{ a }}</li></ul>
        </q-banner>
      </div>

      <div v-if="plantilla" class="card section-gap">
        <h3>Hojas / archivos CSV esperados</h3>
        <p class="narrative">
          Para CSV, cada archivo debe llamarse exactamente como la hoja:
          <template v-for="(h, i) in plantilla.hojasRequeridas" :key="h"><code>{{ h }}.csv</code><span v-if="i < plantilla.hojasRequeridas.length - 1">, </span></template>.
          Opcional: <code v-for="h in plantilla.hojasOpcionales" :key="h">{{ h }}.csv</code>.
        </p>
      </div>
    </template>

    <div class="card section-gap">
      <h3>Historial de cargas</h3>
      <q-table flat dense :rows="cargas" :columns="columnas" row-key="id" :loading="cargandoHistorial" :rows-per-page-options="[10, 25, 50]" class="tabla-plana" no-data-label="Sin cargas registradas.">
        <template #body-cell-estado="p">
          <q-td :props="p"><q-badge :color="p.value === 'COMPLETADA' ? 'positive' : p.value === 'RECHAZADA' ? 'negative' : 'warning'" :label="p.value" /></q-td>
        </template>
        <template #body-cell-archivo="p">
          <q-td :props="p"><span :title="p.row.errores?.join('\n')">{{ p.value }}</span></q-td>
        </template>
      </q-table>
    </div>
  </AppLayout>
</template>
