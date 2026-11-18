import { defineStore } from 'pinia';
import { api, SESSION_EVENT } from '../api/client.js';

export const ROL_LABEL = { ADMINISTRADOR: 'Administrador', GERENTE: 'Gerente', CLIENTE: 'Cliente' };

export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: null,
    marcas: [],
    cargando: true,
    expiraEn: null,
    mensajeSesion: null,
    _ultimaActividad: 0,
    _escuchando: false,
  }),
  getters: {
    autenticado: (s) => Boolean(s.usuario),
    rol: (s) => s.usuario?.rol ?? null,
    esAdmin: (s) => s.usuario?.rol === 'ADMINISTRADOR',
    esStaff: (s) => ['ADMINISTRADOR', 'GERENTE'].includes(s.usuario?.rol),
    puedeEditar: (s) => s.usuario?.rol === 'ADMINISTRADOR',
    /** Marcas agrupadas por cliente para el selector lateral. */
    clientes(s) {
      const map = new Map();
      for (const m of s.marcas) {
        const g = map.get(m.clienteId) ?? { id: m.clienteId, clave: m.cliente.clave, nombre: m.cliente.nombre, marcas: [] };
        g.marcas.push(m);
        map.set(m.clienteId, g);
      }
      return [...map.values()];
    },
  },
  actions: {
    _aplicar(payload) {
      this.usuario = payload.usuario;
      this.marcas = payload.marcas;
      this.expiraEn = new Date(payload.usuario.expiraEn);
      this._escuchar();
    },
    _escuchar() {
      if (this._escuchando) return;
      this._escuchando = true;
      window.addEventListener(SESSION_EVENT, (event) => {
        const detail = event.detail ?? {};
        if (detail.expired) {
          if (!this.usuario) return;
          this.usuario = null;
          this.marcas = [];
          this.mensajeSesion = detail.code === 'session_expired' ? 'Tu sesión expiró por inactividad.' : 'La sesión dejó de estar activa.';
        } else if (detail.expiraEn) {
          this.expiraEn = new Date(detail.expiraEn);
        }
      });
      // Actividad humana: renueva la sesión como máximo una vez por minuto.
      const onActivity = () => {
        if (!this.usuario) return;
        const now = Date.now();
        if (now - this._ultimaActividad < 60_000) return;
        this._ultimaActividad = now;
        api('/auth/activity', { method: 'POST', body: {} }).catch(() => undefined);
      };
      ['click', 'keydown', 'scroll', 'pointermove'].forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    },
    async cargarSesion() {
      try {
        this._aplicar(await api('/auth/session', { passive: true }));
      } catch {
        this.usuario = null;
      } finally {
        this.cargando = false;
      }
    },
    async login(username, password) {
      const payload = await api('/auth/login', { method: 'POST', body: { username, password } });
      this.mensajeSesion = null;
      this._aplicar(payload);
    },
    async logout() {
      await api('/auth/logout', { method: 'POST', body: {} }).catch(() => undefined);
      this.usuario = null;
      this.marcas = [];
    },
    async renovar() {
      this._ultimaActividad = Date.now();
      await api('/auth/activity', { method: 'POST', body: {} });
    },
    async refrescarMarcas() {
      this._aplicar(await api('/auth/session', { passive: true }));
    },
  },
});
