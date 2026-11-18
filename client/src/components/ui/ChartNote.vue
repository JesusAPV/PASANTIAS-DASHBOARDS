<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useDashboardStore } from '../../stores/dashboard.js';

const props = defineProps({ noteKey: { type: String, required: true } });
const store = useDashboardStore();

const texto = ref(store.notas[props.noteKey] ?? '');
const estado = ref('idle');
let timer;
let dirty = false;

watch(() => store.notas[props.noteKey], (v) => { if (!dirty) texto.value = v ?? ''; });

const labels = { idle: '', saving: 'Guardando…', saved: 'Guardado', error: 'No se pudo guardar' };

function onInput(value) {
  texto.value = value;
  dirty = true;
  estado.value = 'saving';
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    try {
      await store.guardarNota(props.noteKey, value);
      estado.value = 'saved';
      dirty = false;
      window.setTimeout(() => { if (estado.value === 'saved') estado.value = 'idle'; }, 1800);
    } catch {
      estado.value = 'error';
    }
  }, 700);
}
onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <div class="chart-note" :data-note-board="noteKey">
    <label class="sr-only" :for="`note-${noteKey}`">Nota del gráfico</label>
    <textarea
      :id="`note-${noteKey}`" :value="texto" :readonly="!store.editable"
      :placeholder="store.editable ? 'Escribe una nota; se guarda automáticamente.' : 'Nota del Administrador'"
      @input="onInput($event.target.value)"
    />
    <span class="note-state" :class="estado" aria-live="polite">{{ labels[estado] }}</span>
  </div>
</template>
