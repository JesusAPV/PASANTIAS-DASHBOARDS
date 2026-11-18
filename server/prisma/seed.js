import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
const { PrismaClient, Rol, RedSocial } = pkg;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const SECCIONES_BASE = [
  'resumen',
  'glosario',
  'estado',
  'destacadas',
  'demografia',
  'ubicacion',
  'interacciones',
  'publicaciones',
  'atraccion-engagement',
  'reels',
  'historias',
  'conclusiones',
];
const CLIENTES = [
  {
    clave: 'montalban',
    nombre: 'Montalbán',
    marcas: [
      {
        clave: 'papelon',
        nombre: 'Papelón',
        orden: 1,
        aliases: ['papelon'],
        secciones: [...SECCIONES_BASE, 'competencia'],
        tema: {
          primary: '#165f47',
          secondary: '#2da049',
          accent: '#f6c817',
          accent2: '#fe9200',
          soft: '#e3ea98',
          border: '#aed140',
          genderMale: '#a91287',
          palette: ['#165f47', '#2da049', '#aed140', '#e3ea98', '#f6c817', '#fe9200', '#a91287'],
        },
      },
      {
        clave: 'gella',
        nombre: 'Gella',
        orden: 2,
        aliases: ['gella'],
        secciones: [...SECCIONES_BASE, 'competencia'],
        tema: {
          primary: '#800218',
          secondary: '#bc1213',
          accent: '#ff339a',
          accent2: '#f37022',
          soft: '#ff99c0',
          border: '#ff339a',
          genderMale: '#1569b1',
          palette: ['#ff339a', '#bc1213', '#800218', '#1569b1', '#339933', '#f37022', '#ff99c0', '#ff3366', '#68579e', '#3399ff', '#66cc66', '#fff275'],
        },
      },
      {
        clave: 'dulfit',
        nombre: 'Dulfit',
        orden: 3,
        aliases: ['dulfit', '0 calorias', '0_calorias', 'cero calorias'],
        secciones: [...SECCIONES_BASE, 'competencia'],
        tema: {
          primary: '#005e60',
          secondary: '#00a4b1',
          accent: '#9c9666',
          accent2: '#67d4ec',
          soft: '#c8ecee',
          border: '#67d4ec',
          genderMale: '#67d4ec',
          palette: ['#9c9666', '#00a4b1', '#67d4ec', '#c8ecee', '#005e60'],
        },
      },
    ],
  },
  {
    clave: 'mimesa',
    nombre: 'MiMesa',
    marcas: [
      {
        clave: 'mimesa',
        nombre: 'MiMesa',
        orden: 1,
        aliases: ['mimesa', 'mi mesa'],
        metaSeguidores: 30000,
        secciones: [...SECCIONES_BASE, 'comunicaciones'],
        tema: {
          primary: '#193c6b',
          secondary: '#009639',
          accent: '#95c11f',
          accent2: '#02afaa',
          soft: '#e8f3cc',
          border: '#95c11f',
          genderMale: '#193c6b',
          palette: ['#193c6b', '#009639', '#95c11f', '#02afaa'],
        },
      },
    ],
  },
  {
    clave: 'sherwin',
    nombre: 'Sherwin Williams',
    marcas: [
      {
        clave: 'sherwin-williams',
        nombre: 'Sherwin-Williams',
        orden: 1,
        aliases: ['sherwin', 'sherwin-williams', 'ppv'],
        metaSeguidores: 30000,
        secciones: [...SECCIONES_BASE, 'competencia'],
        tema: {
          primary: '#0067b2',
          secondary: '#000000',
          accent: '#0067b2',
          accent2: '#4a90d9',
          soft: '#e7f3fb',
          border: '#0067b2',
          genderMale: '#0067b2',
          palette: ['#0067b2', '#000000', '#4a90d9', '#9cc5e8'],
        },
      },
    ],
  },
];
const USUARIOS = [
  { username: 'admin', nombre: 'Administrador', rol: Rol.ADMINISTRADOR, password: 'Admin12345!' },
  { username: 'gerente', nombre: 'Gerente General', rol: Rol.GERENTE, password: 'Gerente12345!' },
  { username: 'montalban', nombre: 'Cliente Montalbán', rol: Rol.CLIENTE, password: 'Cliente12345!', cliente: 'montalban' },
  { username: 'mimesa', nombre: 'Cliente MiMesa', rol: Rol.CLIENTE, password: 'Cliente12345!', cliente: 'mimesa' },
  { username: 'sherwin', nombre: 'Cliente Sherwin Williams', rol: Rol.CLIENTE, password: 'Cliente12345!', cliente: 'sherwin' },
];
async function main() {
  for (const c of CLIENTES) {
    const cliente = await prisma.cliente.upsert({
      where: { clave: c.clave },
      update: { nombre: c.nombre },
      create: { clave: c.clave, nombre: c.nombre },
    });
    for (const m of c.marcas) {
      const marca = await prisma.marca.upsert({
        where: { clave: m.clave },
        update: { nombre: m.nombre, tema: m.tema, secciones: m.secciones, aliases: m.aliases, orden: m.orden, metaSeguidores: m.metaSeguidores ?? null },
        create: {
          clienteId: cliente.id,
          clave: m.clave,
          nombre: m.nombre,
          tema: m.tema,
          secciones: m.secciones,
          aliases: m.aliases,
          orden: m.orden,
          metaSeguidores: m.metaSeguidores ?? null,
          logoUrl: `/brand-assets/${m.clave}/logo.png`,
        },
      });
      await prisma.cuenta.upsert({
        where: { marcaId_network: { marcaId: marca.id, network: RedSocial.INSTAGRAM } },
        update: {},
        create: { marcaId: marca.id, network: RedSocial.INSTAGRAM },
      });
    }
  }
  for (const u of USUARIOS) {
    const cliente = u.cliente ? await prisma.cliente.findUniqueOrThrow({ where: { clave: u.cliente } }) : null;
    const passwordHash = await bcrypt.hash(u.password, 10);
    const usuario = await prisma.usuario.upsert({
      where: { username: u.username },
      update: { nombre: u.nombre, rol: u.rol, clienteId: cliente?.id ?? null },
      create: { username: u.username, nombre: u.nombre, rol: u.rol, passwordHash, clienteId: cliente?.id ?? null },
    });
    if (cliente) {
      const marcas = await prisma.marca.findMany({ where: { clienteId: cliente.id } });
      for (const marca of marcas) {
        await prisma.usuarioMarca.upsert({
          where: { usuarioId_marcaId: { usuarioId: usuario.id, marcaId: marca.id } },
          update: {},
          create: { usuarioId: usuario.id, marcaId: marca.id },
        });
      }
    }
  }
  const resumen = await prisma.marca.findMany({ include: { cliente: true }, orderBy: [{ cliente: { clave: 'asc' } }, { orden: 'asc' }] });
  console.log('Marcas:', resumen.map((m) => `${m.cliente.nombre} > ${m.nombre}`).join(' | '));
  console.log('Usuarios:', USUARIOS.map((u) => `${u.username} (${u.rol})`).join(' | '));
}
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
