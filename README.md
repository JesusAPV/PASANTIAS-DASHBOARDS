# Centro de Control Analítico · Milímetro de Segundo

Plataforma web que centraliza los reportes mensuales de **Instagram Analytics** de las marcas:

| Cliente | Marcas |
|---|---|
| Montalbán | Papelón, Gella, Dulfit |
| MiMesa | MiMesa |
| Sherwin Williams | Sherwin-Williams |

Reemplaza a los tres dashboards PHP independientes (`MIMESA-local`, `MONTALBAN-local`, `SHERWIN`)
por un único sistema con base de datos relacional, carga de archivos por lotes y control de acceso por roles.

---

## Índice

1. [Tecnologías](#1-tecnologías)
2. [Requisitos previos](#2-requisitos-previos)
3. [Instalación paso a paso](#3-instalación-paso-a-paso)
4. [Ejecutar el sistema](#4-ejecutar-el-sistema)
5. [Usuarios de prueba y roles](#5-usuarios-de-prueba-y-roles)
6. [Guía de pruebas (checklist)](#6-guía-de-pruebas-checklist)
7. [Formato de los archivos de carga](#7-formato-de-los-archivos-de-carga)
8. [Pruebas automáticas](#8-pruebas-automáticas)
9. [Comandos útiles](#9-comandos-útiles)
10. [Solución de problemas](#10-solución-de-problemas)
11. [Estructura del proyecto](#11-estructura-del-proyecto)
12. [Arquitectura y modelo de datos](#12-arquitectura-y-modelo-de-datos)

---

## 1. Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + Quasar 2 + Pinia + Vue Router (JavaScript, Vite) |
| Backend | Node.js + Express 5 (JavaScript ESM) |
| ORM | Prisma 7 con adaptador `pg` |
| Base de datos | PostgreSQL |
| Autenticación | JWT en cookie HttpOnly + contraseñas con bcrypt |
| Ingesta | Archivos XLSX (libro completo) o CSV (un archivo por hoja) |

---

## 2. Requisitos previos

Instalar en el equipo de pruebas:

| Software | Versión | Cómo verificar |
|---|---|---|
| Node.js | 20 o superior (probado con 22) | `node -v` |
| pnpm | 10 | `pnpm -v` |
| PostgreSQL | 14 o superior (probado con 18) | `psql --version` |

**Instalar pnpm** (si no está):

```bash
npm install -g pnpm@10
```

**PostgreSQL:** debe estar corriendo en `localhost:5432` y debe conocerse el usuario y la contraseña
(normalmente `postgres`). Crear una base de datos vacía para el proyecto:

```bash
# Con psql (o crearla desde pgAdmin: clic derecho en Databases > Create > Database)
psql -U postgres -c "CREATE DATABASE \"MilimetroDSegundo\";"
```

> Puede usarse otro nombre de base de datos; solo hay que reflejarlo en el `.env` (paso 3.2).

---

## 3. Instalación paso a paso

Todos los comandos se ejecutan desde una terminal ubicada en la carpeta `dashboard-app/`.

### 3.1 Instalar dependencias

```bash
cd dashboard-app
pnpm install
```

### 3.2 Configurar variables de entorno

Copiar el archivo de ejemplo y editarlo:

```bash
cp server/.env.example server/.env
```

En Windows (CMD) también puede hacerse con `copy server\.env.example server\.env`.

Abrir `server/.env` y ajustar **como mínimo** estos dos valores:

| Variable | Qué poner | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Usuario, contraseña y nombre de la BD de PostgreSQL | `postgresql://postgres:miClave@localhost:5432/MilimetroDSegundo?schema=public` |
| `JWT_SECRET` | Texto largo y aleatorio | Generarlo con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

El resto de variables puede dejarse con su valor por defecto:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto de la API |
| `NODE_ENV` | `development` | Entorno |
| `CORS_ORIGIN` | `http://localhost:5173` | URL del frontend |
| `SESSION_IDLE_MINUTES` | `60` | Minutos sin actividad antes de cerrar sesión |
| `SESSION_WARNING_MINUTES` | `5` | Minutos de aviso antes del cierre |
| `UPLOADS_DIR` | `./storage/uploads` | Carpeta de imágenes subidas |
| `REPORTS_DIR` | `./storage/reports` | Carpeta donde se archivan los Excel/CSV cargados |
| `MAX_IMAGE_MB` | `5` | Tamaño máximo de imagen |

### 3.3 Generar el cliente de base de datos y crear las tablas

```bash
pnpm --filter server exec prisma generate
pnpm --filter server exec prisma migrate deploy
```

Resultado esperado: `All migrations have been successfully applied.` (se crean 20 tablas).
Si la base de datos ya estaba creada, el mensaje es `No pending migrations to apply.`

### 3.4 Cargar datos iniciales (clientes, marcas y usuarios)

```bash
pnpm --filter server seed
```

Resultado esperado:

```
Marcas: MiMesa > MiMesa | Montalbán > Papelón | Montalbán > Gella | Montalbán > Dulfit | Sherwin Williams > Sherwin-Williams
Usuarios: admin (ADMINISTRADOR) | gerente (GERENTE) | montalban (CLIENTE) | mimesa (CLIENTE) | sherwin (CLIENTE)
```

### 3.5 (Recomendado) Migrar los datos reales de los dashboards PHP

Importa los 5 Excel de agosto 2026, notas, conclusiones, ubicaciones, publicaciones destacadas con
sus imágenes y comunicaciones internas desde las carpetas `MIMESA-local`, `MONTALBAN-local` y `SHERWIN`.

Requiere que esas tres carpetas estén **al mismo nivel que `dashboard-app/`**:

```
dasboard/
├── MIMESA-local/
├── MONTALBAN-local/
├── SHERWIN/
└── dashboard-app/   ← este proyecto
```

```bash
pnpm --filter server migrar-legado
```

Resultado esperado (resumido):

```
== Papelón          Excel: Agosto 2026, 66 filas en ~900 ms   Notas: 12   Contenidos: 5 (5 con imagen)
== Gella            Excel: Agosto 2026, 73 filas ...
== Dulfit           Excel: Agosto 2026, 61 filas ...
== MiMesa           Excel: Agosto 2026, 32 filas ...          Comunicaciones: 8
== Sherwin-Williams Excel: Agosto 2026, 75 filas ...
```

> Si se omite este paso, el sistema arranca vacío y los datos se cargan desde la pantalla
> **Cargar archivos** (ver sección 6, prueba 4).

---

## 4. Ejecutar el sistema

```bash
pnpm dev
```

Esto levanta ambos servidores a la vez:

| Servicio | URL | Mensaje esperado en la terminal |
|---|---|---|
| Frontend | **http://localhost:5173** | `VITE ready ... Local: http://localhost:5173/` |
| API | http://localhost:3000 | `API escuchando en http://localhost:3000 (development)` |

Abrir **http://localhost:5173** en el navegador (Chrome, Edge o Firefox recientes).

Comprobación rápida de la API: http://localhost:3000/api/health debe responder `{"ok":true,...}`.

Para detener: `Ctrl + C` en la terminal.

---

## 5. Usuarios de prueba y roles

| Usuario | Contraseña | Rol | Qué puede hacer |
|---|---|---|---|
| `admin` | `Admin12345!` | **Administrador** | Ve todas las marcas, edita todo el contenido, carga archivos, gestiona usuarios |
| `gerente` | `Gerente12345!` | **Gerente** | Ve todas las marcas y el historial de cargas. **No edita** |
| `montalban` | `Cliente12345!` | **Cliente** | Solo ve Papelón, Gella y Dulfit. **No edita** |
| `mimesa` | `Cliente12345!` | **Cliente** | Solo ve MiMesa. **No edita** |
| `sherwin` | `Cliente12345!` | **Cliente** | Solo ve Sherwin-Williams. **No edita** |

> Son credenciales de prueba. Para uso real, cambiarlas desde **Usuarios > icono de llave**.

**Reglas de sesión:**
- La sesión se cierra tras **60 minutos sin actividad** (configurable).
- **5 minutos antes** aparece un aviso con cuenta regresiva y la opción *Continuar sesión*.
- La sincronización automática entre pestañas no cuenta como actividad.

---

## 6. Guía de pruebas (checklist)

Se recomienda seguir el orden. Cada prueba indica el resultado esperado.
Los valores numéricos corresponden a los datos migrados en el paso 3.5.

### Prueba 1 · Inicio de sesión

| # | Acción | Resultado esperado |
|---|---|---|
| 1.1 | Entrar con `admin` / `clave-incorrecta` | Mensaje *"Usuario o contraseña incorrectos."* |
| 1.2 | Entrar con `admin` / `Admin12345!` | Abre el dashboard de la primera marca |
| 1.3 | Pulsar el icono de salir (arriba a la derecha) | Vuelve a la pantalla de inicio de sesión |
| 1.4 | Escribir http://localhost:5173/marcas/papelon sin sesión | Redirige al inicio de sesión |

### Prueba 2 · Navegación y datos del dashboard (como `admin`)

| # | Acción | Resultado esperado |
|---|---|---|
| 2.1 | En el menú lateral, elegir **Papelón** | Logo de Papelón, colores verde/amarillo. Resumen: **34.355 seguidores, −130 en Agosto, meta 37.000** |
| 2.2 | Elegir **Gella** | Colores rosado/vino. **19.481 seguidores** |
| 2.3 | Elegir **Dulfit** | Colores turquesa. **16.643 seguidores** |
| 2.4 | Elegir **MiMesa** | Colores azul/verde. **30.460 seguidores**. Aparece la sección *Comunicaciones internas* y **no** aparece *Competencia* |
| 2.5 | Elegir **Sherwin-Williams** | Colores azul. **12.401 seguidores, variación +81** |
| 2.6 | Recorrer todas las secciones del menú (Resumen, Guía, Estado, Contenido destacado, Demografía, Ubicación, Interacciones, Publicaciones, Atracción y Engagement, Reels, Historias, Competencia, Conclusiones) | Cada una muestra gráficos/tablas sin errores |
| 2.7 | En **Estado de la cuenta** | Tabla *Histórico del año* con los meses enero–agosto |
| 2.8 | Cambiar el selector **Período** (arriba a la derecha) a otro mes | Los indicadores cambian a ese mes |
| 2.9 | En **Competencia** (Papelón) | Barras de Nestea, Lipton, El Trapiche, Papelón (resaltado) y Tang |

### Prueba 3 · Edición de contenido (como `admin`)

| # | Acción | Resultado esperado |
|---|---|---|
| 3.1 | En **Interacciones**, escribir en la nota debajo de un gráfico | Aparece *"Guardando…"* y luego *"Guardado"* |
| 3.2 | Recargar la página (F5) | La nota sigue ahí (quedó en la base de datos) |
| 3.3 | En **Conclusiones**, editar el texto | Se autoguarda igual que las notas |
| 3.4 | En **Ubicación**, pulsar *Editar*, agregar una fila (p. ej. *Perú 0,5*), *Guardar* | Aviso verde y la tabla se actualiza |
| 3.5 | En **Contenido destacado**, *Registrar publicación*: fecha, imagen JPG/PNG y métricas, *Crear* | Aparece la tarjeta con la imagen y los indicadores |
| 3.6 | Pulsar el icono de ampliar en una imagen | Se abre la imagen en grande |
| 3.7 | *Eliminar* esa publicación y confirmar | La tarjeta desaparece |
| 3.8 | En MiMesa > **Comunicaciones internas**, *Agregar* (tema y formato) | La fila aparece en la tabla; también puede editarse y eliminarse |

### Prueba 4 · Carga de archivos (como `admin`)

Menú lateral > **Administración > Cargar archivos**.

| # | Acción | Resultado esperado |
|---|---|---|
| 4.1 | Marca **Gella**, año **2026**, seleccionar `MONTALBAN-local/MONTALBAN-local/montalban_private/gella.xlsx` y pulsar *Procesar archivo* | Mensaje verde *"Carga completada: Agosto (2026-08-01)"*, ~73 registros en **menos de 2 segundos** |
| 4.2 | Repetir la misma carga | Termina bien y **no duplica** datos (los indicadores del dashboard siguen iguales) |
| 4.3 | Subir un archivo inválido: cualquier archivo renombrado a `prueba.csv` | Mensaje rojo con el motivo del rechazo; **no se guarda nada** |
| 4.4 | Subir el Excel de otra marca con una hoja eliminada (abrir una copia en Excel, borrar la hoja *Seguidores*, guardar) | Rechazo: *"El archivo no cumple la estructura esperada."* con el detalle *Falta la hoja obligatoria "Seguidores".* |
| 4.5 | Revisar la tabla **Historial de cargas** | Aparecen todas las cargas con estado COMPLETADA o RECHAZADA, filas, duración y usuario |
| 4.6 | (Opcional) Carga por CSV: desde Excel, *Guardar como > CSV* cada hoja con su nombre exacto (`Seguidores.csv`, `Totales.csv`, …) y subir todos juntos | Mismo resultado que con el XLSX |

### Prueba 5 · Gestión de usuarios (como `admin`)

Menú lateral > **Administración > Usuarios**.

| # | Acción | Resultado esperado |
|---|---|---|
| 5.1 | *Nuevo usuario*: usuario `prueba`, rol **Cliente**, cliente **Montalbán**, marcar solo **Gella**, contraseña `Prueba12345!` | Aparece en la tabla |
| 5.2 | Cerrar sesión y entrar con `prueba` / `Prueba12345!` | Solo ve **Gella** en el menú |
| 5.3 | Volver como `admin`, editar `prueba` y desactivar *Usuario activo* | `prueba` ya no puede iniciar sesión |
| 5.4 | Intentar crear un usuario con contraseña de menos de 10 caracteres | Mensaje de error de validación |
| 5.5 | Eliminar el usuario `prueba` | Desaparece de la tabla |

### Prueba 6 · Control de acceso por rol

| # | Usuario | Acción | Resultado esperado |
|---|---|---|---|
| 6.1 | `gerente` | Recorrer marcas | Ve las 5 marcas; las notas aparecen **solo lectura**; no hay botones Editar/Eliminar |
| 6.2 | `gerente` | Menú Administración | Solo aparece **Historial de cargas** |
| 6.3 | `gerente` | Escribir http://localhost:5173/admin/usuarios | Redirige a su dashboard |
| 6.4 | `sherwin` | Menú lateral | Solo aparece **Sherwin-Williams**; no hay menú Administración |
| 6.5 | `sherwin` | Escribir http://localhost:5173/marcas/papelon | Redirige a Sherwin-Williams |
| 6.6 | `montalban` | Menú lateral | Solo Papelón, Gella y Dulfit |

### Prueba 7 · Sincronización entre usuarios

| # | Acción | Resultado esperado |
|---|---|---|
| 7.1 | Abrir `admin` en una ventana normal y `gerente` en una ventana de incógnito, ambos en la misma marca y sección | — |
| 7.2 | Como `admin`, editar una nota | En la ventana del `gerente` la nota se actualiza sola en ~3 segundos |

### Prueba 8 · Expiración de sesión (opcional)

| # | Acción | Resultado esperado |
|---|---|---|
| 8.1 | En `server/.env` poner `SESSION_IDLE_MINUTES=6`, reiniciar `pnpm dev`, iniciar sesión y no tocar nada | A los ~1 min aparece el aviso con cuenta regresiva de 5 minutos |
| 8.2 | Pulsar *Continuar sesión* | El aviso desaparece y la sesión se renueva |
| 8.3 | Dejar que llegue a 0 | Vuelve al inicio de sesión con *"Tu sesión expiró por inactividad."* |

Al terminar, restaurar `SESSION_IDLE_MINUTES=60`.

---

## 7. Formato de los archivos de carga

El sistema lee los libros mensuales exportados de Metricool.

**Opción A – XLSX:** un único archivo con estas hojas (los nombres deben coincidir):

| Hoja | Contenido |
|---|---|
| `Detalles IG` | Detalle por publicación del mes |
| `Totales` | Totales y celda **CURRENT MONTH** (define el mes del reporte) |
| `Seguidores` | Seguidores por mes, variación, publicaciones y **Meta** |
| `Sexo y edad` | Porcentajes por género y rango de edad |
| `Interacciones SIN ADS` | Me gusta, comentarios, compartidos, guardados, reposteos, alcance |
| `Métricas SIN ADS` | Impresiones, visitas al perfil, engagement, alcance y reproducciones de Reels |
| `Métricas ST` | Impresiones, alcance y cantidad de historias |
| `Competidores` | Seguidores, publicaciones, likes, comentarios y engagement de la competencia |
| `Detalles ST` *(opcional)* | Detalle por historia |

**Opción B – CSV:** un archivo por hoja, con el nombre exacto de la hoja: `Seguidores.csv`, `Totales.csv`,
`Interacciones SIN ADS.csv`, etc. Se aceptan separadores `,` o `;` y números como `34,355`, `34.355` o `0,46`.

**Reglas de validación:**
- Si falta una hoja obligatoria, cambió un encabezado clave o no se identifica el mes, **se rechaza todo el archivo**.
- El **año** no viene en el libro: se indica al cargar.
- Se guardan todos los meses desde enero hasta el mes vigente.
- Volver a cargar el mismo mes **actualiza** los datos, no los duplica.
- Cada carga queda registrada (archivo, tamaño, estado, filas, duración, usuario) y el archivo original
  se conserva en `server/storage/reports/`.

---

## 8. Pruebas automáticas

```bash
pnpm test
```

Ejecuta 22 pruebas: el lector de archivos contra los 5 libros reales de los proyectos PHP (verifica mes,
seguidores, demografía, competidores y que cada archivo se procese en menos de 30 segundos) y el
interpretador de formatos numéricos. Resultado esperado: `Tests  22 passed (22)`.

Con el sistema corriendo, este comando imprime un resumen por marca para contrastar cifras:

```bash
pnpm --filter server verificar
```

```
MiMesa            Agosto 2026  seg= 30460 var=  473 meta=30000 ...
Papelón           Agosto 2026  seg= 34355 var= -130 meta=37000 ...
Gella             Agosto 2026  seg= 19481 var=  688 meta=25000 ...
Dulfit            Agosto 2026  seg= 16643 var=   68 meta=30000 ...
Sherwin-Williams  Agosto 2026  seg= 12401 var=   81 meta=30000 ...
```

---

## 9. Comandos útiles

Ejecutar desde `dashboard-app/`:

| Comando | Para qué sirve |
|---|---|
| `pnpm dev` | Levanta API y frontend |
| `pnpm test` | Pruebas automáticas |
| `pnpm build` | Compila el frontend para producción (`client/dist`) |
| `pnpm --filter server seed` | Vuelve a crear clientes, marcas y usuarios iniciales |
| `pnpm --filter server migrar-legado` | Importa los datos de los dashboards PHP |
| `pnpm --filter server verificar` | Resumen de cifras por marca (con la API corriendo) |
| `pnpm --filter server prisma:studio` | Abre una interfaz web para ver las tablas de la base de datos |
| `pnpm --filter server exec prisma migrate reset` | **Borra** la base de datos y la recrea con el seed (pide confirmación) |

---

## 10. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Falta la variable de entorno DATABASE_URL` | No existe `server/.env` | Paso 3.2 |
| `password authentication failed for user "postgres"` | Contraseña incorrecta en `DATABASE_URL` | Corregir el `.env` |
| `database "MilimetroDSegundo" does not exist` | No se creó la base de datos | Sección 2 |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL apagado | Iniciar el servicio de PostgreSQL |
| `@prisma/client did not initialize yet` | Falta generar el cliente | `pnpm --filter server exec prisma generate` |
| `relation "usuarios" does not exist` | Faltan las tablas | `pnpm --filter server exec prisma migrate deploy` |
| El login responde *"Usuario o contraseña incorrectos"* con las credenciales de la tabla | No se ejecutó el seed | `pnpm --filter server seed` |
| La pantalla dice *"Todavía no hay métricas para …"* | No se cargaron datos | Paso 3.5 o Prueba 4.1 |
| `Error: listen EADDRINUSE :::3000` o el puerto 5173 ocupado | Ya hay otra instancia corriendo | Cerrar la otra terminal o cambiar `PORT` |
| El frontend carga pero todo da error de conexión | La API no está corriendo | Revisar la terminal de `pnpm dev`; probar http://localhost:3000/api/health |
| `pnpm` muestra *"Ignored build scripts"* | Aviso normal de pnpm | Se puede ignorar |
| `migrar-legado` dice *"Excel no encontrado"* | Las carpetas PHP no están al lado de `dashboard-app/` | Ver estructura en el paso 3.5 |

---

## 11. Estructura del proyecto

```
dashboard-app/
├── package.json               scripts del monorepo (pnpm workspaces)
├── server/                    API · Node.js + Express + Prisma (JavaScript)
│   ├── .env.example           plantilla de configuración
│   ├── prisma/
│   │   ├── schema.prisma      modelo de datos (20 tablas)
│   │   ├── migrations/        historial de cambios de la base de datos
│   │   └── seed.js            datos iniciales: clientes, marcas, usuarios
│   ├── scripts/
│   │   ├── migrar-legado.js   importa los datos de los dashboards PHP
│   │   └── verificar-api.js   resumen de cifras por marca
│   ├── src/
│   │   ├── index.js / app.js  arranque del servidor y rutas
│   │   ├── config.js          lectura del .env
│   │   ├── lib/               conexión Prisma, errores, auditoría
│   │   └── modules/
│   │       ├── auth/          login, sesiones, roles y acceso por marca
│   │       ├── marcas/        marcas visibles por usuario
│   │       ├── ingesta/       lector XLSX/CSV, validación y guardado (+ pruebas)
│   │       ├── dashboard/     datos del tablero y edición editorial
│   │       ├── usuarios/      administración de usuarios
│   │       └── archivos/      entrega protegida de imágenes
│   └── storage/               imágenes subidas y archivos cargados (se crea solo)
└── client/                    Frontend · Vue 3 + Quasar (JavaScript)
    ├── src/
    │   ├── main.js / App.vue
    │   ├── router/            rutas y permisos por rol
    │   ├── stores/            estado global (sesión y dashboard)
    │   ├── api/               cliente HTTP
    │   ├── layouts/           menú lateral y encabezado
    │   ├── pages/             Login, Dashboard, Cargas, Usuarios
    │   ├── sections/          14 secciones del tablero
    │   ├── components/ui/     tarjetas, gráficos y notas reutilizables
    │   └── styles/            estilos heredados + ajustes de Quasar
    └── public/                logos de marcas e íconos
```

---

## 12. Arquitectura y modelo de datos

```
Navegador (Vue + Quasar, :5173)
        │  /api/*  (proxy de Vite)
        ▼
API Express (:3000) ── JWT en cookie HttpOnly ── middleware de roles
        │
        ├── Ingesta: XLSX/CSV → validación → transacción → PostgreSQL
        └── Prisma ORM ───────────────────────────────► PostgreSQL
```

**Tablas principales:**

| Grupo | Tablas |
|---|---|
| Organización | `clientes`, `marcas` |
| Acceso | `usuarios`, `usuarios_marcas`, `sesiones` |
| Métricas (desde archivos) | `cuentas`, `metricas_cuenta`, `demografia_cuenta`, `publicaciones`, `metricas_publicacion`, `competidores`, `metricas_competidor` |
| Contenido editorial | `notas`, `textos_editoriales`, `ubicaciones`, `contenidos_manuales`, `comunicaciones` |
| Trazabilidad | `cargas_archivo`, `auditoria` |

Las métricas tienen restricción de unicidad por **marca + período**, lo que impide registros duplicados
al recargar un archivo. Toda operación administrativa (inicios de sesión, cargas, ediciones, cambios de
usuarios) queda registrada en `auditoria`.
