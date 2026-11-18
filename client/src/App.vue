<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth.js';

const auth = useAuthStore();
onMounted(() => auth.cargarSesion());
</script>

<template>
  <div v-if="auth.cargando" class="app-loader" role="status" aria-busy="true">
    <div class="app-loader-panel">
      <img class="app-loader-logo" src="/img/conejo-icon2.png" alt="" />
      <p>Espere un momento por favor, cargando contenido...</p>
    </div>
  </div>
  <router-view v-else />
</template>
