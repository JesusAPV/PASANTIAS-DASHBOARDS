<script setup>
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '../api/client.js';
import { ROL_LABEL } from '../stores/auth.js';
import { formatDateTime } from '../lib/format.js';
import AppLayout from '../layouts/AppLayout.vue';
import SectionHeading from '../components/ui/SectionHeading.vue';

const $q = useQuasar();
const usuarios = ref([]);
const catalogo = ref({ clientes: [], roles: [] });
const cargando = ref(false);
const dialogo = ref(false);
const dialogoPassword = ref(false);
const guardando = ref(false);
const form = ref(null);
const passwordForm = ref({ id: null, username: '', password: '' });

const columnas = [
  { name: 'username', label: 'Usuario', field: 'username', align: 'left', sortable: true },
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'rol', label: 'Rol', field: (r) => ROL_LABEL[r.rol], align: 'left', sortable: true },
  { name: 'cliente', label: 'Cliente', field: (r) => r.cliente?.nombre ?? '—', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'left' },
  { name: 'ultimoAcceso', label: 'Último acceso', field: (r) => formatDateTime(r.ultimoAcceso), align: 'left' },
  { name: 'acciones', label: '', field: 'id', align: 'right' },
];

const opcionesRol = computed(() => catalogo.value.roles.map((r) => ({ label: ROL_LABEL[r], value: r })));
const opcionesCliente = computed(() => catalogo.value.clientes.map((c) => ({ label: c.nombre, value: c.id })));
const marcasCliente = computed(() => catalogo.value.clientes.find((c) => c.id === form.value?.clienteId)?.marcas ?? []);

async function cargar() {
  cargando.value = true;
  try {
    const [u, c] = await Promise.all([api('/usuarios', { passive: true }), api('/usuarios/catalogo', { passive: true })]);
    usuarios.value = u.usuarios;
    catalogo.value = c;
  } catch (e) { $q.notify({ type: 'negative', message: e.message }); }
  finally { cargando.value = false; }
}
onMounted(cargar);

function abrir(u) {
  form.value = u
    ? { id: u.id, username: u.username, nombre: u.nombre, rol: u.rol, clienteId: u.clienteId, marcaIds: [...u.marcaIds], activo: u.activo, password: '' }
    : { id: null, username: '', nombre: '', rol: 'CLIENTE', clienteId: null, marcaIds: [], activo: true, password: '' };
  dialogo.value = true;
}
async function guardar() {
  guardando.value = true;
  try {
    const f = form.value;
    const body = { username: f.username, nombre: f.nombre, rol: f.rol, activo: f.activo, clienteId: f.rol === 'CLIENTE' ? f.clienteId : null, marcaIds: f.rol === 'CLIENTE' ? f.marcaIds : [] };
    if (!f.id) body.password = f.password;
    await api(f.id ? `/usuarios/${f.id}` : '/usuarios', { method: f.id ? 'PUT' : 'POST', body });
    dialogo.value = false;
    $q.notify({ type: 'positive', message: 'Usuario guardado.' });
    cargar();
  } catch (e) { $q.notify({ type: 'negative', message: e.message }); }
  finally { guardando.value = false; }
}
function abrirPassword(u) { passwordForm.value = { id: u.id, username: u.username, password: '' }; dialogoPassword.value = true; }
async function cambiarPassword() {
  guardando.value = true;
  try {
    await api(`/usuarios/${passwordForm.value.id}/password`, { method: 'PUT', body: { password: passwordForm.value.password } });
    dialogoPassword.value = false;
    $q.notify({ type: 'positive', message: 'Contraseña actualizada.' });
  } catch (e) { $q.notify({ type: 'negative', message: e.message }); }
  finally { guardando.value = false; }
}
function eliminar(u) {
  $q.dialog({ title: 'Eliminar usuario', message: `¿Eliminar al usuario "${u.username}"?`, cancel: true, persistent: true, ok: { label: 'Eliminar', color: 'negative', unelevated: true } })
    .onOk(async () => {
      try { await api(`/usuarios/${u.id}`, { method: 'DELETE' }); cargar(); }
      catch (e) { $q.notify({ type: 'negative', message: e.message }); }
    });
}
</script>

<template>
  <AppLayout title="Usuarios" subtitle="Gestión de accesos por rol">
    <SectionHeading title="Usuarios del sistema" subtitle="Administrador: gestión total · Gerente: todos los tableros · Cliente: solo sus marcas." source="Solo Administrador" />
    <div class="card">
      <q-table flat dense :rows="usuarios" :columns="columnas" row-key="id" :loading="cargando" :rows-per-page-options="[0]" hide-pagination class="tabla-plana">
        <template #top-right><q-btn unelevated color="primary" icon="person_add" label="Nuevo usuario" @click="abrir()" /></template>
        <template #body-cell-username="p"><q-td :props="p"><b>{{ p.value }}</b></q-td></template>
        <template #body-cell-activo="p"><q-td :props="p"><q-badge :color="p.value ? 'positive' : 'negative'" :label="p.value ? 'Activo' : 'Inactivo'" /></q-td></template>
        <template #body-cell-acciones="p">
          <q-td :props="p" class="text-right">
            <q-btn flat round dense icon="edit" size="sm" aria-label="Editar" @click="abrir(p.row)" />
            <q-btn flat round dense icon="key" size="sm" aria-label="Cambiar contraseña" @click="abrirPassword(p.row)" />
            <q-btn flat round dense icon="delete" size="sm" color="negative" aria-label="Eliminar" @click="eliminar(p.row)" />
          </q-td>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="dialogo">
      <q-card v-if="form" style="min-width: min(92vw, 520px)">
        <q-card-section class="text-h6">{{ form.id ? 'Editar usuario' : 'Nuevo usuario' }}</q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="form.username" label="Usuario" outlined dense hint="3-40 caracteres: letras, números, . _ -" />
          <q-input v-model="form.nombre" label="Nombre" outlined dense />
          <q-select v-model="form.rol" :options="opcionesRol" emit-value map-options label="Rol" outlined dense />
          <template v-if="form.rol === 'CLIENTE'">
            <q-select v-model="form.clienteId" :options="opcionesCliente" emit-value map-options label="Cliente" outlined dense @update:model-value="form.marcaIds = []" />
            <q-option-group v-if="marcasCliente.length > 1" v-model="form.marcaIds" type="checkbox" inline :options="marcasCliente.map((m) => ({ label: m.nombre, value: m.id }))" />
            <div v-if="marcasCliente.length > 1" class="text-caption text-grey-7">Marcas visibles (vacío = todas las del cliente).</div>
          </template>
          <q-input v-if="!form.id" v-model="form.password" type="password" label="Contraseña (mín. 10 caracteres)" outlined dense />
          <q-toggle v-if="form.id" v-model="form.activo" label="Usuario activo" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Guardar" :loading="guardando" @click="guardar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogoPassword">
      <q-card style="min-width: 360px">
        <q-card-section class="text-h6">Cambiar contraseña · {{ passwordForm.username }}</q-card-section>
        <q-card-section><q-input v-model="passwordForm.password" type="password" label="Nueva contraseña (mín. 10 caracteres)" outlined dense autofocus /></q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Actualizar" :loading="guardando" :disable="passwordForm.password.length < 10" @click="cambiarPassword" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </AppLayout>
</template>
