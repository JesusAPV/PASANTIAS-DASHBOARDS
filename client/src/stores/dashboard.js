import { defineStore } from 'pinia';
import { api } from '../api/client.js';
import { useAuthStore } from './auth.js';

const POLL_MS = 3000;

/** Estado del tablero de la marca activa, con sondeo pasivo de revisión. */
export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    marcaId: null,
    periodo: null,
    data: null,
    cargando: false,
    error: '',
    _timer: null,
    _fallos: 0,
  }),
  getters: {
    editable: () => useAuthStore().puedeEditar,
    notas: (s) => s.data?.editorial?.notas ?? {},
    textos: (s) => s.data?.editorial?.textos ?? {},
    series: (s) => s.data?.series ?? { labels: [] },
  },
  actions: {
    async abrir(marcaId, periodo) {
      const cambio = marcaId !== this.marcaId || periodo !== this.periodo;
      this.marcaId = marcaId;
      this.periodo = periodo ?? null;
      if (cambio) this.data = null;
      await this.cargar();
      this._programar();
    },
    async cargar() {
      if (!this.marcaId) return;
      this.cargando = !this.data;
      this.error = '';
      try {
        const q = this.periodo ? `?periodo=${encodeURIComponent(this.periodo)}` : '';
        this.data = await api(`/dashboard/${this.marcaId}${q}`, { passive: Boolean(this.data) });
      } catch (e) {
        this.error = e.message;
      } finally {
        this.cargando = false;
      }
    },
    cerrar() {
      window.clearTimeout(this._timer);
      this._timer = null;
      this.marcaId = null;
      this.data = null;
    },
    _programar() {
      window.clearTimeout(this._timer);
      const delay = Math.min(30_000, POLL_MS * 2 ** Math.min(this._fallos, 3));
      this._timer = window.setTimeout(() => this._sondear(), delay);
    },
    async _sondear() {
      if (!this.marcaId) return;
      if (document.visibilityState === 'visible') {
        try {
          const r = await api(`/dashboard/${this.marcaId}/revision`, { passive: true });
          this._fallos = 0;
          if (this.data && r.revision !== this.data.revision) await this.cargar();
        } catch {
          this._fallos += 1;
        }
      }
      this._programar();
    },

    // ---- edición editorial (solo Administrador) ----
    async guardarNota(clave, texto) {
      await api(`/dashboard/${this.marcaId}/notas/${clave}`, { method: 'PUT', body: { texto } });
      if (this.data) this.data.editorial.notas[clave] = texto;
    },
    async guardarTexto(clave, texto) {
      await api(`/dashboard/${this.marcaId}/textos/${clave}`, { method: 'PUT', body: { texto } });
      if (this.data) this.data.editorial.textos[clave] = texto;
    },
    async guardarUbicaciones(tipo, filas) {
      await api(`/dashboard/${this.marcaId}/ubicaciones`, { method: 'PUT', body: { tipo, filas } });
      await this.cargar();
    },
    async guardarComunicacion(item) {
      const body = { tema: item.tema, formato: item.formato, periodo: this.data?.periodo ? `${this.data.periodo.key}-01` : null };
      await api(item.id ? `/dashboard/${this.marcaId}/comunicaciones/${item.id}` : `/dashboard/${this.marcaId}/comunicaciones`, { method: item.id ? 'PUT' : 'POST', body });
      await this.cargar();
    },
    async eliminarComunicacion(id) {
      await api(`/dashboard/${this.marcaId}/comunicaciones/${id}`, { method: 'DELETE' });
      await this.cargar();
    },
    async guardarContenido(form) {
      const fd = new FormData();
      fd.append('tipo', form.tipo);
      fd.append('fecha', form.fecha);
      fd.append('metricas', JSON.stringify(form.metricas));
      if (form.imagen) fd.append('imagen', form.imagen);
      await api(form.id ? `/dashboard/${this.marcaId}/contenidos/${form.id}` : `/dashboard/${this.marcaId}/contenidos`, { method: form.id ? 'PUT' : 'POST', body: fd });
      await this.cargar();
    },
    async eliminarContenido(id) {
      await api(`/dashboard/${this.marcaId}/contenidos/${id}`, { method: 'DELETE' });
      await this.cargar();
    },
  },
});
