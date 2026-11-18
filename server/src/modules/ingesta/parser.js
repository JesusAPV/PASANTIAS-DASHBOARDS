/**
 * Parser de los libros mensuales de Instagram (Metricool).
 * Trabaja sobre matrices de filas, por lo que sirve tanto para XLSX
 * (una matriz por hoja) como para CSV (un archivo por hoja).
 */
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const HOJAS_REQUERIDAS = [
  'Detalles IG',
  'Totales',
  'Seguidores',
  'Sexo y edad',
  'Interacciones SIN ADS',
  'Métricas SIN ADS',
  'Métricas ST',
  'Competidores',
];
export const HOJAS_OPCIONALES = ['Detalles ST'];
export class ParseError extends Error {
  issues;
  constructor(message, issues = []) {
    super(message);
    this.issues = issues;
  }
}
// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
export const normalizar = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
/**
 * Convierte una celda a número aceptando formatos "34,355", "34.355", "0.46",
 * "0,46", "1.234,56", "1,234.56" y "12.5%". Distingue el separador de miles
 * del decimal por su posición.
 */
export const num = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  let text = String(value).trim().replace(/[%\s]/g, '');
  if (!/^[-+]?[0-9.,]+$/.test(text)) return undefined;
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? ',' : '.';
    text = text.replace(decimalSep === ',' ? /\./g : /,/g, '').replace(',', '.');
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.';
    const parts = text.split(sep);
    const esMiles = parts.length > 1 && parts.slice(1).every((p) => p.length === 3) && parts[0].replace(/[-+]/, '').length <= 3;
    text = esMiles ? parts.join('') : parts.join('.');
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const mesIndex = (value) => MESES.findIndex((m) => normalizar(m) === normalizar(value)) + 1;
/** Busca una hoja tolerando acentos y mayúsculas. */
export function hoja(sheets, nombre) {
  const wanted = normalizar(nombre);
  const key = Object.keys(sheets).find((k) => normalizar(k) === wanted);
  return key ? sheets[key] : undefined;
}
/** Devuelve el primer bloque de 12 filas mensuales que empiece en "Enero" a partir de `desde`. */
function bloqueMensual(rows, desde = 0) {
  const start = rows.findIndex((row, i) => i >= desde && mesIndex(row?.[0]) === 1);
  const result = new Map();
  if (start < 0) return result;
  for (let i = start; i < Math.min(start + 12, rows.length); i += 1) {
    const mes = mesIndex(rows[i]?.[0]);
    if (mes > 0 && !result.has(mes)) result.set(mes, rows[i]);
  }
  return result;
}
function resolverMesActual(sheets) {
  const totales = hoja(sheets, 'Totales') ?? [];
  const detalles = hoja(sheets, 'Detalles IG') ?? [];
  const marker = totales.findIndex((row) => normalizar(row?.[0]) === 'current month');
  const candidatos = [marker >= 0 ? totales[marker + 1]?.[0] : null, totales[19]?.[0], detalles[1]?.[0]];
  for (const c of candidatos) {
    const mes = mesIndex(c);
    if (mes > 0) return mes;
  }
  throw new ParseError('No se pudo identificar el mes vigente del libro (celda "CURRENT MONTH" en Totales).');
}
function validarEstructura(sheets, issues) {
  for (const nombre of HOJAS_REQUERIDAS) {
    if (!hoja(sheets, nombre)) issues.push(`Falta la hoja obligatoria "${nombre}".`);
  }
  if (issues.length) return;
  const checks = [
    [hoja(sheets, 'Seguidores'), 2, 0, 'MES', 'Seguidores'],
    [hoja(sheets, 'Seguidores'), 2, 1, 'SEGUIDORES', 'Seguidores'],
    [hoja(sheets, 'Interacciones SIN ADS'), 2, 1, 'ME GUSTA', 'Interacciones SIN ADS'],
    [hoja(sheets, 'Métricas SIN ADS'), 2, 10, 'ENGAGEMENT SIN ADS INTERACCIONES/SEGUIDORES*100', 'Métricas SIN ADS'],
  ];
  for (const [rows, r, c, expected, sheet] of checks) {
    if (normalizar(rows?.[r]?.[c]) !== normalizar(expected)) {
      issues.push(`La estructura de "${sheet}" cambió: se esperaba "${expected}" en la fila ${r + 1}, columna ${c + 1}.`);
    }
  }
}
// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------
function parseMeses(sheets, mesActual) {
  const seguidores = bloqueMensual(hoja(sheets, 'Seguidores'));
  const interacciones = bloqueMensual(hoja(sheets, 'Interacciones SIN ADS'));
  const metricas = bloqueMensual(hoja(sheets, 'Métricas SIN ADS'));
  const historias = bloqueMensual(hoja(sheets, 'Métricas ST'));
  const result = [];
  for (let mes = 1; mes <= mesActual; mes += 1) {
    const s = seguidores.get(mes) ?? [];
    const i = interacciones.get(mes) ?? [];
    const m = metricas.get(mes) ?? [];
    const h = historias.get(mes) ?? [];
    const item = {
      mes,
      seguidores: num(s[1]),
      variacionSeguidores: num(s[2]),
      publicacionesCount: num(s[5]),
      meGusta: num(i[1]),
      comentarios: num(i[4]),
      compartidos: num(i[7]),
      guardados: num(i[10]),
      reposteos: num(i[13]),
      alcancePosts: num(i[16]),
      impresionesPosts: num(m[1]),
      visitasPerfil: num(m[7]),
      engagement: num(m[10]),
      alcanceReels: num(m[17]),
      reproduccionesReels: num(m[20]),
      impresionesHistorias: num(h[1]),
      alcanceHistorias: num(h[4]),
      historiasCount: num(h[7]),
    };
    const tieneDatos = Object.entries(item).some(([k, v]) => k !== 'mes' && v !== undefined);
    if (tieneDatos) result.push(item);
  }
  // Variación de seguidores derivada cuando la celda viene vacía (caso Sherwin).
  for (let idx = 1; idx < result.length; idx += 1) {
    const actual = result[idx];
    const previo = result[idx - 1];
    if (actual.variacionSeguidores === undefined && actual.seguidores !== undefined && previo.seguidores !== undefined && previo.mes === actual.mes - 1) {
      actual.variacionSeguidores = actual.seguidores - previo.seguidores;
    }
  }
  return result;
}
function parseDemografia(sheets) {
  const rows = hoja(sheets, 'Sexo y edad');
  const result = [];
  let categoria = null;
  for (const row of rows) {
    const label = normalizar(row?.[0]);
    if (label === 'sexo') {
      categoria = 'SEXO';
      continue;
    }
    if (label === 'edad') {
      categoria = 'EDAD';
      continue;
    }
    const porcentaje = num(row?.[1]);
    if (categoria && label && porcentaje !== undefined && mesIndex(row?.[0]) === 0) {
      result.push({ categoria, segmento: String(row[0]).trim(), porcentaje });
    }
  }
  return result;
}
const BLOQUES_COMPETENCIA = [
  ['SEGUIDORES', 'seguidores'],
  ['PUBLICACIONES', 'publicaciones'],
  ['LIKES', 'meGusta'],
  ['COMENTARIOS', 'comentarios'],
  ['ENGAGEMENT', 'engagement'],
];
function parseCompetidores(sheets, mesActual, advertencias) {
  const rows = hoja(sheets, 'Competidores');
  const porNombre = new Map();
  const titulos = new Set(BLOQUES_COMPETENCIA.map(([t]) => normalizar(t)));
  for (const [titulo, campo] of BLOQUES_COMPETENCIA) {
    const inicio = rows.findIndex((row) => normalizar(row?.[0]) === normalizar(titulo));
    if (inicio < 0) {
      advertencias.push(`Competidores: no se encontró el bloque "${titulo}".`);
      continue;
    }
    const header = rows[inicio + 1] ?? [];
    const fin = rows.findIndex((row, i) => i > inicio + 1 && titulos.has(normalizar(row?.[0])));
    const meses = bloqueMensual(rows.slice(0, fin > 0 ? fin : rows.length), inicio + 2);
    for (let col = 1; col < header.length; col += 2) {
      const nombre = String(header[col] ?? '').trim();
      if (!nombre) continue;
      const key = normalizar(nombre);
      const comp = porNombre.get(key) ?? { nombre, meses: [] };
      for (let mes = 1; mes <= mesActual; mes += 1) {
        const valor = num(meses.get(mes)?.[col]);
        if (valor === undefined) continue;
        let registro = comp.meses.find((m) => m.mes === mes);
        if (!registro) {
          registro = { mes };
          comp.meses.push(registro);
        }
        registro[campo] = valor;
      }
      porNombre.set(key, comp);
    }
  }
  return [...porNombre.values()].filter((c) => c.meses.length);
}
function parsePublicaciones(sheets) {
  const rows = hoja(sheets, 'Detalles IG') ?? [];
  const header = rows.findIndex((row) => normalizar(row?.[0]) === 'publicacion');
  if (header < 0) return [];
  const result = [];
  for (let i = header + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const indice = num(row[0]);
    if (indice === undefined) break;
    const alcancePost = num(row[6]);
    const alcanceReel = num(row[7]);
    result.push({
      indice,
      tipo: alcanceReel !== undefined && alcancePost === undefined ? 'REEL' : 'POST',
      meGusta: num(row[1]),
      comentarios: num(row[2]),
      compartidos: num(row[3]),
      guardados: num(row[4]),
      reposteos: num(row[5]),
      alcance: num(row[13]) ?? alcancePost ?? alcanceReel,
      reproducciones: num(row[10]),
      visitasPerfil: num(row[11]),
      interacciones: num(row[12]),
      engagement: num(row[14]),
    });
  }
  return result;
}
function parseHistorias(sheets) {
  const rows = hoja(sheets, 'Detalles ST') ?? [];
  const header = rows.findIndex((row) => row.some((c) => normalizar(c) === 'storie' || normalizar(c) === 'story' || normalizar(c) === 'historia'));
  if (header < 0) return [];
  const col = rows[header].findIndex((c) => ['storie', 'story', 'historia'].includes(normalizar(c)));
  const result = [];
  for (let i = header + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const indice = num(row[col]);
    if (indice === undefined) break;
    result.push({ indice, impresiones: num(row[col + 1]), alcance: num(row[col + 2]) });
  }
  return result;
}
// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------
export function parseReport(sheets) {
  const issues = [];
  validarEstructura(sheets, issues);
  if (issues.length) throw new ParseError('El archivo no cumple la estructura esperada.', issues);
  const advertencias = [];
  const mesActual = resolverMesActual(sheets);
  const meses = parseMeses(sheets, mesActual);
  const actual = meses.find((m) => m.mes === mesActual);
  if (!actual || actual.seguidores === undefined) {
    throw new ParseError(`No existe la fila de ${MESES[mesActual - 1]} con seguidores en la hoja "Seguidores".`);
  }
  const seguidoresRows = hoja(sheets, 'Seguidores');
  const metaRow = seguidoresRows.find((row) => normalizar(row?.[0]) === 'meta');
  const metaSeguidores = num(metaRow?.[1]);
  const demografia = parseDemografia(sheets);
  if (!demografia.length) advertencias.push('La hoja "Sexo y edad" no contiene porcentajes legibles.');
  return {
    mesActual,
    metaSeguidores,
    meses,
    demografia,
    competidores: parseCompetidores(sheets, mesActual, advertencias),
    publicaciones: parsePublicaciones(sheets),
    historias: parseHistorias(sheets),
    advertencias,
  };
}
