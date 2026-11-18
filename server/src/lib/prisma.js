import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import { config } from '../config.js';

// `@prisma/client` es CommonJS: se importa el paquete completo y se extraen
// el constructor y los enums del esquema.
export const {
  PrismaClient,
  Prisma,
  Rol,
  RedSocial,
  Granularidad,
  TipoPublicacion,
  TipoContenidoManual,
  TipoUbicacion,
  CategoriaDemografica,
  ClaveTextoEditorial,
  FormatoArchivo,
  EstadoCarga,
} = pkg;

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.databaseUrl }),
  log: config.env === 'development' ? ['warn', 'error'] : ['error'],
});
