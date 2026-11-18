<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore, ROL_LABEL } from '../stores/auth.js';
import { seccionesDeMarca } from '../lib/secciones.js';
import SessionIdleDialog from '../components/SessionIdleDialog.vue';

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  marca: { type: Object, default: null },
});

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const drawer = ref(window.innerWidth > 1024);

const secciones = computed(() => (props.marca ? seccionesDeMarca(props.marca.secciones) : []));
const seccionActiva = computed(() => route.query.sec ?? secciones.value[0]?.id ?? 'resumen');
const logo = computed(() => props.marca?.logoUrl ?? '/img/milimetro-icon.png');
const logoCliente = computed(() => (props.marca?.cliente.clave === 'montalban' ? '/img/montalban-icon.png' : '/img/milimetro-icon.png'));

/** Aplica la paleta de la marca activa con data-brand + variables CSS. */
watch(() => props.marca, (marca) => {
  const root = document.documentElement;
  const vars = ['--navy', '--navy2', '--orange', '--orange2', '--brand-soft', '--brand-border', '--gender-male'];
  vars.forEach((v) => root.style.removeProperty(v));
  for (let i = 1; i <= 12; i += 1) root.style.removeProperty(`--brand-color-${i}`);
  if (!marca) { delete root.dataset.brand; return; }
  root.dataset.brand = marca.clave;
  const t = marca.tema ?? {};
  const map = { '--navy': t.primary, '--navy2': t.secondary, '--orange': t.accent, '--orange2': t.accent2, '--brand-soft': t.soft, '--brand-border': t.border, '--gender-male': t.genderMale };
  for (const [k, v] of Object.entries(map)) if (v) root.style.setProperty(k, v);
  (t.palette ?? []).forEach((c, i) => root.style.setProperty(`--brand-color-${i + 1}`, c));
}, { immediate: true });

function irASeccion(id) {
  router.replace({ query: { ...route.query, sec: id } });
  document.querySelector('.content')?.scrollTo({ top: 0 });
  if (window.innerWidth <= 1024) drawer.value = false;
}

async function salir() {
  await auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <q-layout view="lHh Lpr lFf" class="app-layout">
    <q-drawer v-model="drawer" show-if-above :width="232" :breakpoint="1024" class="side" bordered>
      <q-scroll-area class="fit">
        <div class="brandhead">
          <img class="montalban-identity-logo" :src="logoCliente" :alt="marca?.cliente.nombre ?? 'Milímetro de Segundo'" />
        </div>

        <div v-for="grupo in auth.clientes" :key="grupo.id" class="brand-switch" :aria-label="`Marcas ${grupo.nombre}`">
          <span v-if="auth.clientes.length > 1" class="brand-group-label">{{ grupo.nombre }}</span>
          <button
            v-for="m in grupo.marcas" :key="m.id" type="button" class="brand-btn"
            :class="{ active: m.clave === route.params.clave }"
            @click="router.push({ name: 'marca', params: { clave: m.clave } })"
          >{{ m.nombre }}</button>
        </div>

        <nav v-if="marca && route.name === 'marca'" class="nav" aria-label="Secciones del dashboard">
          <button v-for="s in secciones" :key="s.id" type="button" :class="{ active: seccionActiva === s.id }" @click="irASeccion(s.id)">{{ s.label }}</button>
        </nav>

        <nav v-if="auth.esStaff" class="nav nav-admin" aria-label="Administración">
          <span class="brand-group-label">Administración</span>
          <router-link v-if="auth.esAdmin" :to="{ name: 'cargas' }"><q-icon name="upload_file" /> Cargar archivos</router-link>
          <router-link v-if="auth.esAdmin" :to="{ name: 'usuarios' }"><q-icon name="manage_accounts" /> Usuarios</router-link>
          <router-link :to="{ name: 'historial' }"><q-icon name="history" /> Historial de cargas</router-link>
        </nav>

        <div class="side-footer">
          <img class="side-footer-logo-milimetro" src="/img/milimetro-icon.png" alt="" />
          <span>© Desarrollado por <a href="https://milimetrodesegundo.com/" target="_blank" rel="noopener">Milimetro de Segundo Analytics</a></span>
          <span>&amp;</span>
          <img class="side-footer-logo" src="/img/conejo-icon2.png" alt="" />
          <span><a href="https://elconejodelsombrero.com/" target="_blank" rel="noopener">El Conejo del Sombrero.</a></span>
        </div>
      </q-scroll-area>
    </q-drawer>

    <q-page-container class="main">
      <header class="top">
        <div class="top-start">
          <q-btn flat round dense icon="menu" class="menu-toggle-q" aria-label="Alternar menú" @click="drawer = !drawer" />
          <div class="titlewrap">
            <router-link :to="{ name: 'home' }"><img class="brand-logo" :src="logo" :alt="marca ? `Logo ${marca.nombre}` : 'Milímetro de Segundo'" /></router-link>
            <div><h1>{{ title }}</h1><p>{{ subtitle }}</p></div>
          </div>
        </div>
        <div class="user-tools">
          <div class="user-copy"><b>{{ auth.usuario?.nombre }}</b><small>{{ ROL_LABEL[auth.rol] ?? auth.rol }}</small></div>
          <q-btn flat round dense icon="logout" class="logout-btn-q" aria-label="Cerrar sesión" title="Cerrar sesión" @click="salir" />
        </div>
      </header>
      <q-page class="content"><slot /></q-page>
    </q-page-container>

    <SessionIdleDialog />
  </q-layout>
</template>
