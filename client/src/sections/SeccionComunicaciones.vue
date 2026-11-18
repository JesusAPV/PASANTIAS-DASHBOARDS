<script setup>
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useDashboardStore } from '../stores/dashboard.js';
import SectionHeading from '../components/ui/SectionHeading.vue';
import ChartNote from '../components/ui/ChartNote.vue';

defineProps({ data: { type: Object, required: true } });
const store = useDashboardStore();
const $q = useQuasar();

const dialogo = ref(false);
const form = ref({ id: null, tema: '', formato: '' });
const guardando = ref(false);

function abrir(item) {
  form.value = item ? { id: item.id, tema: item.tema, formato: item.formato } : { id: null, tema: '', formato: '' };
  dialogo.value = true;
}
async function guardar() {
  guardando.value = true;
  try {
    await store.guardarComunicacion(form.value);
    dialogo.value = false;
    $q.notify({ type: 'positive', message: 'Comunicación guardada.' });
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message });
  } finally {
    guardando.value = false;
  }
}
function eliminar(item) {
  $q.dialog({ title: 'Eliminar comunicación', message: `¿Eliminar "${item.tema}"?`, cancel: true, persistent: true, ok: { label: 'Eliminar', color: 'negative', unelevated: true } })
    .onOk(() => store.eliminarComunicacion(item.id).catch((e) => $q.notify({ type: 'negative', message: e.message })));
}
</script>

<template>
  <SectionHeading title="Comunicaciones internas" subtitle="Formatos de comunicación ejecutados en el período." source="Carga manual" />
  <div class="card"><h3>Resumen <span class="badge manual">Manual</span></h3><ChartNote note-key="comunicaciones.resumen" /></div>
  <div class="card section-gap">
    <h3>Detalle</h3>
    <table class="datatable">
      <thead><tr><th>Tema</th><th>Formato</th><th v-if="store.editable" /></tr></thead>
      <tbody>
        <tr v-if="!data.editorial.comunicaciones.length"><td colspan="3"><p class="narrative">Sin comunicaciones registradas.</p></td></tr>
        <tr v-for="c in data.editorial.comunicaciones" :key="c.id">
          <td>{{ c.tema }}</td><td>{{ c.formato }}</td>
          <td v-if="store.editable" class="table-admin-actions">
            <q-btn flat round dense icon="edit" size="sm" aria-label="Editar" @click="abrir(c)" />
            <q-btn flat round dense icon="delete" size="sm" color="negative" aria-label="Eliminar" @click="eliminar(c)" />
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="store.editable" class="table-actions"><q-btn unelevated color="primary" icon="add" label="Agregar" @click="abrir()" /></div>
  </div>

  <q-dialog v-model="dialogo">
    <q-card style="min-width: 380px">
      <q-card-section class="text-h6">{{ form.id ? 'Editar' : 'Nueva' }} comunicación</q-card-section>
      <q-card-section class="q-gutter-sm">
        <q-input v-model="form.tema" label="Tema" outlined dense autofocus />
        <q-input v-model="form.formato" label="Formato" outlined dense placeholder="p. ej. 4 mailing + 4 stories" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancelar" v-close-popup />
        <q-btn unelevated color="primary" label="Guardar" :loading="guardando" :disable="!form.tema || !form.formato" @click="guardar" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
