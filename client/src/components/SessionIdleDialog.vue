<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();
const restante = ref(null);
let timer;

function tick() {
  if (!auth.usuario || !auth.expiraEn) { restante.value = null; return; }
  const avisoMs = (auth.usuario.avisoMinutos ?? 5) * 60_000;
  const ms = auth.expiraEn.getTime() - Date.now();
  restante.value = ms <= avisoMs ? Math.max(0, ms) : null;
}
onMounted(() => { tick(); timer = window.setInterval(tick, 1000); });
onBeforeUnmount(() => window.clearInterval(timer));

const visible = computed(() => restante.value !== null && Boolean(auth.usuario));
const minutos = computed(() => Math.floor((restante.value ?? 0) / 60_000));
const segundos = computed(() => String(Math.floor(((restante.value ?? 0) % 60_000) / 1000)).padStart(2, '0'));

async function salir() { await auth.logout(); router.push({ name: 'login' }); }
</script>

<template>
  <q-dialog :model-value="visible" persistent>
    <q-card class="idle-card">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="timer" color="warning" size="32px" />
        <div class="text-h6">Tu sesión está por vencer</div>
      </q-card-section>
      <q-card-section>
        Por inactividad, la sesión se cerrará en <b>{{ minutos }}:{{ segundos }}</b>. ¿Deseas continuar?
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cerrar sesión" @click="salir" />
        <q-btn unelevated color="primary" label="Continuar sesión" @click="auth.renovar()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
