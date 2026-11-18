-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'GERENTE', 'CLIENTE');

-- CreateEnum
CREATE TYPE "RedSocial" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'X', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "Granularidad" AS ENUM ('DIARIA', 'MENSUAL');

-- CreateEnum
CREATE TYPE "TipoPublicacion" AS ENUM ('POST', 'REEL', 'STORY', 'CAROUSEL', 'VIDEO');

-- CreateEnum
CREATE TYPE "TipoContenidoManual" AS ENUM ('PUBLICACION', 'HISTORIA');

-- CreateEnum
CREATE TYPE "TipoUbicacion" AS ENUM ('PAIS', 'CIUDAD');

-- CreateEnum
CREATE TYPE "CategoriaDemografica" AS ENUM ('SEXO', 'EDAD');

-- CreateEnum
CREATE TYPE "ClaveTextoEditorial" AS ENUM ('CONCLUSIONES', 'RECOMENDACIONES');

-- CreateEnum
CREATE TYPE "FormatoArchivo" AS ENUM ('CSV', 'XLSX');

-- CreateEnum
CREATE TYPE "EstadoCarga" AS ENUM ('PROCESANDO', 'COMPLETADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcas" (
    "id" UUID NOT NULL,
    "cliente_fk" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "metricool_id" INTEGER,
    "logo_url" TEXT,
    "tema" JSONB,
    "secciones" JSONB,
    "meta_seguidores" INTEGER,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "cliente_fk" UUID,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_marcas" (
    "usuario_fk" UUID NOT NULL,
    "marca_fk" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_marcas_pkey" PRIMARY KEY ("usuario_fk","marca_fk")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" UUID NOT NULL,
    "usuario_fk" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ultima_actividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocada_en" TIMESTAMP(3),

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas" (
    "id" UUID NOT NULL,
    "marca_fk" UUID NOT NULL,
    "network" "RedSocial" NOT NULL,
    "handle" TEXT,
    "metricool_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricas_cuenta" (
    "id" SERIAL NOT NULL,
    "cuenta_fk" UUID NOT NULL,
    "periodo" DATE NOT NULL,
    "granularidad" "Granularidad" NOT NULL DEFAULT 'MENSUAL',
    "seguidores" INTEGER,
    "variacion_seguidores" INTEGER,
    "publicaciones_count" INTEGER,
    "me_gusta" INTEGER,
    "comentarios" INTEGER,
    "compartidos" INTEGER,
    "guardados" INTEGER,
    "reposteos" INTEGER,
    "alcance_posts" INTEGER,
    "impresiones_posts" INTEGER,
    "visitas_perfil" INTEGER,
    "engagement" DECIMAL(8,4),
    "alcance_reels" INTEGER,
    "reproducciones_reels" INTEGER,
    "impresiones_historias" INTEGER,
    "alcance_historias" INTEGER,
    "historias_count" INTEGER,
    "extra" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "metricas_cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demografia_cuenta" (
    "id" SERIAL NOT NULL,
    "cuenta_fk" UUID NOT NULL,
    "periodo" DATE NOT NULL,
    "categoria" "CategoriaDemografica" NOT NULL,
    "segmento" TEXT NOT NULL,
    "porcentaje" DECIMAL(6,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demografia_cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicaciones" (
    "id" UUID NOT NULL,
    "marca_fk" UUID NOT NULL,
    "network" "RedSocial" NOT NULL,
    "tipo" "TipoPublicacion" NOT NULL,
    "metricool_id" TEXT,
    "fecha_publicacion" TIMESTAMP(3) NOT NULL,
    "permalink" TEXT,
    "texto" TEXT,
    "metricas_acumuladas" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "publicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricas_publicacion" (
    "id" SERIAL NOT NULL,
    "publicacion_fk" UUID NOT NULL,
    "periodo" DATE NOT NULL,
    "impresiones" INTEGER,
    "alcance" INTEGER,
    "me_gusta" INTEGER,
    "comentarios" INTEGER,
    "compartidos" INTEGER,
    "guardados" INTEGER,
    "reproducciones" INTEGER,
    "extra" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metricas_publicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competidores" (
    "id" UUID NOT NULL,
    "marca_fk" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "network" "RedSocial" NOT NULL DEFAULT 'INSTAGRAM',
    "metricool_id" INTEGER,
    "es_propia" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "competidores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricas_competidor" (
    "id" SERIAL NOT NULL,
    "competidor_fk" UUID NOT NULL,
    "periodo" DATE NOT NULL,
    "seguidores" INTEGER,
    "publicaciones" INTEGER,
    "me_gusta" INTEGER,
    "comentarios" INTEGER,
    "engagement" DECIMAL(8,4),
    "extra" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metricas_competidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ubicaciones" (
    "id" UUID NOT NULL,
    "marca_fk" UUID NOT NULL,
    "tipo" "TipoUbicacion" NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentaje" DECIMAL(6,2) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ubicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" UUID NOT NULL,
    "marca_fk" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textos_editoriales" (
    "id" UUID NOT NULL,
    "marca_fk" UUID NOT NULL,
    "clave" "ClaveTextoEditorial" NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "textos_editoriales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicaciones" (
    "id" UUID NOT NULL,
    "marca_fk" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comunicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contenidos_manuales" (
    "id" UUID NOT NULL,
    "marca_fk" UUID NOT NULL,
    "tipo" "TipoContenidoManual" NOT NULL,
    "fecha" DATE NOT NULL,
    "imagen_url" TEXT,
    "metricas" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contenidos_manuales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargas_archivo" (
    "id" UUID NOT NULL,
    "marca_fk" UUID NOT NULL,
    "usuario_fk" UUID,
    "nombre_archivo" TEXT NOT NULL,
    "formato" "FormatoArchivo" NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "periodo" DATE,
    "estado" "EstadoCarga" NOT NULL DEFAULT 'PROCESANDO',
    "filas_leidas" INTEGER NOT NULL DEFAULT 0,
    "filas_insertadas" INTEGER NOT NULL DEFAULT 0,
    "errores" JSONB,
    "duracion_ms" INTEGER,
    "ruta_almacenada" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado_en" TIMESTAMP(3),

    CONSTRAINT "cargas_archivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" BIGSERIAL NOT NULL,
    "usuario_fk" UUID,
    "operacion" TEXT NOT NULL,
    "entidad" TEXT,
    "entidad_id" TEXT,
    "detalles" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_clave_key" ON "clientes"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_clave_key" ON "marcas"("clave");

-- CreateIndex
CREATE INDEX "marcas_cliente_fk_idx" ON "marcas"("cliente_fk");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_token_hash_key" ON "sesiones"("token_hash");

-- CreateIndex
CREATE INDEX "sesiones_usuario_fk_idx" ON "sesiones"("usuario_fk");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_marca_fk_network_key" ON "cuentas"("marca_fk", "network");

-- CreateIndex
CREATE UNIQUE INDEX "metricas_cuenta_cuenta_fk_periodo_granularidad_key" ON "metricas_cuenta"("cuenta_fk", "periodo", "granularidad");

-- CreateIndex
CREATE UNIQUE INDEX "demografia_cuenta_cuenta_fk_periodo_categoria_segmento_key" ON "demografia_cuenta"("cuenta_fk", "periodo", "categoria", "segmento");

-- CreateIndex
CREATE INDEX "publicaciones_marca_fk_fecha_publicacion_idx" ON "publicaciones"("marca_fk", "fecha_publicacion");

-- CreateIndex
CREATE UNIQUE INDEX "publicaciones_marca_fk_network_metricool_id_key" ON "publicaciones"("marca_fk", "network", "metricool_id");

-- CreateIndex
CREATE UNIQUE INDEX "metricas_publicacion_publicacion_fk_periodo_key" ON "metricas_publicacion"("publicacion_fk", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "competidores_marca_fk_network_nombre_key" ON "competidores"("marca_fk", "network", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "metricas_competidor_competidor_fk_periodo_key" ON "metricas_competidor"("competidor_fk", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "ubicaciones_marca_fk_tipo_nombre_key" ON "ubicaciones"("marca_fk", "tipo", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "notas_marca_fk_clave_key" ON "notas"("marca_fk", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "textos_editoriales_marca_fk_clave_key" ON "textos_editoriales"("marca_fk", "clave");

-- CreateIndex
CREATE INDEX "contenidos_manuales_marca_fk_tipo_fecha_idx" ON "contenidos_manuales"("marca_fk", "tipo", "fecha");

-- CreateIndex
CREATE INDEX "cargas_archivo_marca_fk_created_at_idx" ON "cargas_archivo"("marca_fk", "created_at");

-- CreateIndex
CREATE INDEX "auditoria_created_at_idx" ON "auditoria"("created_at");

-- CreateIndex
CREATE INDEX "auditoria_usuario_fk_idx" ON "auditoria"("usuario_fk");

-- AddForeignKey
ALTER TABLE "marcas" ADD CONSTRAINT "marcas_cliente_fk_fkey" FOREIGN KEY ("cliente_fk") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cliente_fk_fkey" FOREIGN KEY ("cliente_fk") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_marcas" ADD CONSTRAINT "usuarios_marcas_usuario_fk_fkey" FOREIGN KEY ("usuario_fk") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_marcas" ADD CONSTRAINT "usuarios_marcas_marca_fk_fkey" FOREIGN KEY ("marca_fk") REFERENCES "marcas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_fk_fkey" FOREIGN KEY ("usuario_fk") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_marca_fk_fkey" FOREIGN KEY ("marca_fk") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metricas_cuenta" ADD CONSTRAINT "metricas_cuenta_cuenta_fk_fkey" FOREIGN KEY ("cuenta_fk") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demografia_cuenta" ADD CONSTRAINT "demografia_cuenta_cuenta_fk_fkey" FOREIGN KEY ("cuenta_fk") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_marca_fk_fkey" FOREIGN KEY ("marca_fk") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metricas_publicacion" ADD CONSTRAINT "metricas_publicacion_publicacion_fk_fkey" FOREIGN KEY ("publicacion_fk") REFERENCES "publicaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competidores" ADD CONSTRAINT "competidores_marca_fk_fkey" FOREIGN KEY ("marca_fk") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metricas_competidor" ADD CONSTRAINT "metricas_competidor_competidor_fk_fkey" FOREIGN KEY ("competidor_fk") REFERENCES "competidores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ubicaciones" ADD CONSTRAINT "ubicaciones_marca_fk_fkey" FOREIGN KEY ("marca_fk") REFERENCES "marcas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_marca_fk_fkey" FOREIGN KEY ("marca_fk") REFERENCES "marcas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textos_editoriales" ADD CONSTRAINT "textos_editoriales_marca_fk_fkey" FOREIGN KEY ("marca_fk") REFERENCES "marcas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicaciones" ADD CONSTRAINT "comunicaciones_marca_fk_fkey" FOREIGN KEY ("marca_fk") REFERENCES "marcas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenidos_manuales" ADD CONSTRAINT "contenidos_manuales_marca_fk_fkey" FOREIGN KEY ("marca_fk") REFERENCES "marcas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargas_archivo" ADD CONSTRAINT "cargas_archivo_marca_fk_fkey" FOREIGN KEY ("marca_fk") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargas_archivo" ADD CONSTRAINT "cargas_archivo_usuario_fk_fkey" FOREIGN KEY ("usuario_fk") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_fk_fkey" FOREIGN KEY ("usuario_fk") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
