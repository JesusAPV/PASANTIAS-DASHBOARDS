<script setup>
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useDashboardStore } from '../stores/dashboard.js';
import { formatDate, formatNumber, hoyISO } from '../lib/format.js';
import SectionHeading from '../components/ui/SectionHeading.vue';

const props = defineProps({ data: { type: Object, required: true } });
const store = useDashboardStore();
const $q = useQuasar();

const METRICAS = {
  PUBLICACION: [['views', 'Visualizaciones', 'visibility'], ['likes', 'Me gusta', 'favorite'], ['comments', 'Comentarios', 'chat_bubble'], ['shares', 'Compartidos', 'send'], ['reposts', 'Reposteos', 'repeat'], ['saves', 'Guardados', 'bookmark']],
  HISTORIA: [['reach', 'Alcance', 'groups'], ['impressions', 'Impresiones', 'visibility'], ['responses', 'Respuestas', 'chat_bubble']],
};

const tipo = ref('PUBLICACION');
const items = computed(() => props.data.editorial.contenidos.filter((c) => c.tipo === tipo.value));
const dialogo = ref(false);
const visor = ref(null);
const guardando = ref(false);
const form = ref(null);

function abrir(c) {
  form.value = {
    id: c?.id ?? null, tipo: tipo.value, fecha: c?.fecha ?? hoyISO(), imagen: null, preview: c?.imagenUrl ?? null,
    metricas: Object.fromEntries(METRICAS[tipo.value].map(([k]) => [k, c?.metricas[k] ?? 0])),
  };
  dialogo.value = true;
}
function onImagen(file) {
  form.value.imagen = file;
  form.value.preview = file ? URL.createObjectURL(file) : form.value.preview;
}
async function guardar() {
  guardando.value = true;
  try {
    await store.guardarContenido({ ...form.value, metricas: Object.fromEntries(Object.entries(form.value.metricas).map(([k, v]) => [k, Number(v) || 0])) });
    dialogo.value = false;
    $q.notify({ type: 'positive', message: 'Contenido guardado.' });
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message });
  } finally {
    guardando.value = false;
  }
}
function eliminar(c) {
  $q.dialog({ title: 'Eliminar contenido', message: 'Se eliminará el registro y su imagen. Esta acción no se puede deshacer.', cancel: true, persistent: true, ok: { label: 'Eliminar', color: 'negative', unelevated: true } })
    .onOk(() => store.eliminarContenido(c.id).catch((e) => $q.notify({ type: 'negative', message: e.message })));
}
</script>

<template>
  <SectionHeading title="Contenido destacado" subtitle="Catálogo visual administrable con fecha, imagen e indicadores." source="Carga manual" />
  <div class="content-toolbar card">
    <q-btn-toggle v-model="tipo" unelevated toggle-color="primary" :options="[{ label: 'Publicaciones', value: 'PUBLICACION' }, { label: 'Historias', value: 'HISTORIA' }]" />
    <q-btn v-if="store.editable" unelevated color="primary" icon="add" :label="`Registrar ${tipo === 'HISTORIA' ? 'historia' : 'publicación'}`" @click="abrir()" />
  </div>

  <div v-if="!items.length" class="card empty-state"><p class="narrative">No hay {{ tipo === 'HISTORIA' ? 'historias' : 'publicaciones' }} registradas.</p></div>
  <div v-else class="content-catalog">
    <article v-for="c in items" :key="c.id" class="card content-card">
      <div v-if="c.imagenUrl" class="catalog-image">
        <img :src="c.imagenUrl" :alt="`${c.tipo === 'HISTORIA' ? 'Historia' : 'Publicación'} del ${c.fecha}`" loading="lazy" />
        <button type="button" class="expand-image-btn" aria-label="Ampliar imagen" title="Ampliar imagen" @click="visor = c.imagenUrl">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>
        </button>
      </div>
      <div v-else class="media-empty">Sin imagen</div>
      <div class="content-meta">
        <time :datetime="c.fecha">{{ formatDate(c.fecha) }}</time>
        <div v-if="store.editable" class="content-actions">
          <q-btn flat dense size="sm" icon="edit" label="Editar" @click="abrir(c)" />
          <q-btn flat dense size="sm" icon="delete" color="negative" label="Eliminar" @click="eliminar(c)" />
        </div>
      </div>
      <div class="content-metrics">
        <div v-for="[k, label, icon] in METRICAS[c.tipo]" :key="k" class="content-metric" :title="label">
          <div class="content-metric-icon"><q-icon :name="icon" /></div>
          <div class="content-metric-copy"><b>{{ formatNumber(c.metricas[k]) }}</b></div>
        </div>
      </div>
    </article>
  </div>

  <q-dialog v-model="dialogo">
    <q-card v-if="form" style="min-width: min(92vw, 560px)">
      <q-card-section class="text-h6">{{ form.id ? 'Editar' : 'Registrar' }} {{ tipo === 'HISTORIA' ? 'historia' : 'publicación' }}</q-card-section>
      <q-card-section class="q-gutter-md">
        <q-input v-model="form.fecha" type="date" label="Fecha de publicación" outlined dense :max="hoyISO()" />
        <q-file :model-value="form.imagen" label="Imagen (JPG, PNG o WEBP)" outlined dense accept="image/jpeg,image/png,image/webp" clearable @update:model-value="onImagen">
          <template #prepend><q-icon name="image" /></template>
        </q-file>
        <img v-if="form.preview" :src="form.preview" alt="Vista previa" class="form-preview" />
        <div class="manual-metrics">
          <q-input v-for="[k, label, icon] in METRICAS[tipo]" :key="k" v-model.number="form.metricas[k]" type="number" min="0" :label="label" outlined dense>
            <template #prepend><q-icon :name="icon" size="18px" /></template>
          </q-input>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancelar" v-close-popup />
        <q-btn unelevated color="primary" :label="form.id ? 'Guardar cambios' : 'Crear'" :loading="guardando" @click="guardar" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog :model-value="Boolean(visor)" @update:model-value="visor = null">
    <q-card class="visor-card"><img :src="visor" alt="" /></q-card>
  </q-dialog>
</template>
