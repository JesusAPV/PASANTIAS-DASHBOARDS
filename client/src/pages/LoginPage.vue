<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const username = ref('');
const password = ref('');
const verPassword = ref(false);
const error = ref('');
const enviando = ref(false);

async function submit() {
  error.value = '';
  enviando.value = true;
  try {
    await auth.login(username.value.trim(), password.value);
    router.replace(typeof route.query.from === 'string' ? route.query.from : { name: 'home' });
  } catch (e) {
    error.value = e.message ?? 'No se pudo iniciar sesión.';
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <main class="login-shell">
      <section class="login-card" aria-labelledby="loginTitle">
        <div class="login-brand"><img class="login-brand-logo" src="/img/milimetro-icon.png" alt="Milímetro de Segundo" /></div>
        <div class="login-copy">
          <p>Acceso privado</p>
          <h1 id="loginTitle">Iniciar sesión</h1>
          <span>Centro de control analítico de marcas.</span>
        </div>
        <q-form class="login-form-q" @submit.prevent="submit">
          <q-input v-model="username" label="Usuario" outlined dense autocomplete="username" autocapitalize="none" :disable="enviando" />
          <q-input
            v-model="password" label="Contraseña" outlined dense :type="verPassword ? 'text' : 'password'" autocomplete="current-password" :disable="enviando"
          >
            <template #append>
              <q-icon :name="verPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="verPassword = !verPassword" />
            </template>
          </q-input>
          <p class="form-message" role="alert">{{ error || auth.mensajeSesion || '' }}</p>
          <q-btn type="submit" unelevated color="primary" class="full-width" :label="enviando ? 'Ingresando…' : 'Ingresar'" :loading="enviando" :disable="!username || !password" />
        </q-form>
        <div class="login-footer">
          <img class="login-footer-logo-milimetro" src="/img/milimetro-icon.png" alt="" />
          <span>© Desarrollado por <a href="https://milimetrodesegundo.com/" target="_blank" rel="noopener">Milimetro de Segundo Analytics</a></span>
          <span>&amp;</span>
          <img class="login-footer-logo" src="/img/conejo-icon2.png" alt="" />
          <span><a href="https://elconejodelsombrero.com/" target="_blank" rel="noopener">El Conejo del Sombrero.</a></span>
        </div>
      </section>
    </main>
  </div>
</template>
