<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useDashboardStore } from '../stores/dashboard.js';
import SectionHeading from '../components/ui/SectionHeading.vue';

defineProps({ data: { type: Object, required: true } });
const store = useDashboardStore();

const BLOQUES = [
  { clave: 'conclusiones', titulo: 'Conclusiones generales', subtitulo: 'Texto editorial del cierre mensual.' },
  { clave: 'recomendaciones', titulo: 'Recomendaciones', subtitulo: 'Próximas acciones sugeridas al cliente.' },
];

const textos = ref(Object.fromEntries(BLOQUES.map((b) => [b.clave, store.textos[b.clave] ?? ''])));
const estados = ref({});
const dirty = {};
const timers = {};

watch(() => store.textos, (t) => { for (const b of BLOQUES) if (!dirty[b.clave]) textos.value[b.clave] = t[b.clave] ?? ''; }, { deep: true });

function onInput(clave, value) {
  textos.value[clave] = value;
  dirty[clave] = true;
  estados.value[clave] = 'Guardando…';
  window.clearTimeout(timers[clave]);
  timers[clave] = window.setTimeout(async () => {
    try { await store.guardarTexto(clave, value); dirty[clave] = false; estados.value[clave] = 'Guardado'; }
    catch (e) { estados.value[clave] = e.message; }
  }, 800);
}
onBeforeUnmount(() => Object.values(timers).forEach((t) => window.clearTimeout(t)));
</script>

<template>
  <template v-for="(b, i) in BLOQUES" :key="b.clave">
    <div v-if="i" class="section-gap" />
    <SectionHeading :title="b.titulo" :subtitle="b.subtitulo" :source="store.editable ? 'Autoguardado del Administrador' : 'Contenido publicado'" />
    <div class="card editorial-card">
      <textarea
        class="editorial-text" :value="textos[b.clave]" :readonly="!store.editable"
        :placeholder="store.editable ? 'Escribe el texto editorial…' : 'Sin contenido publicado.'" @input="onInput(b.clave, $event.target.value)"
      />
      <span class="copy-state" aria-live="polite">{{ estados[b.clave] ?? '' }}</span>
    </div>
  </template>
</template>
