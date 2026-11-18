import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes = [
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue'), meta: { publica: true } },
  { path: '/', name: 'home', redirect: () => {
    const auth = useAuthStore();
    return auth.marcas.length ? { name: 'marca', params: { clave: auth.marcas[0].clave } } : { name: 'login' };
  } },
  { path: '/marcas/:clave', name: 'marca', component: () => import('../pages/DashboardPage.vue') },
  { path: '/admin/cargas', name: 'cargas', component: () => import('../pages/CargasPage.vue'), meta: { roles: ['ADMINISTRADOR'] } },
  { path: '/admin/historial', name: 'historial', component: () => import('../pages/CargasPage.vue'), props: { soloHistorial: true }, meta: { roles: ['ADMINISTRADOR', 'GERENTE'] } },
  { path: '/admin/usuarios', name: 'usuarios', component: () => import('../pages/UsuariosPage.vue'), meta: { roles: ['ADMINISTRADOR'] } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.cargando) await auth.cargarSesion();
  if (to.meta.publica) return auth.autenticado && to.name === 'login' ? { name: 'home' } : true;
  if (!auth.autenticado) return { name: 'login', query: { from: to.fullPath } };
  if (to.meta.roles && !to.meta.roles.includes(auth.rol)) return { name: 'home' };
  return true;
});
