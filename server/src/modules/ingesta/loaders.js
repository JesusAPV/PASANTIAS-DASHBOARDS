import * as XLSX from 'xlsx';
import { parse as parseCsv } from 'csv-parse/sync';
import path from 'node:path';
import { HOJAS_OPCIONALES, HOJAS_REQUERIDAS, ParseError, normalizar } from './parser.js';
/** Convierte un libro XLSX en matrices por hoja (sin omitir celdas vacías). */
export function sheetsFromXlsx(buffer) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  } catch {
    throw new ParseError('El archivo XLSX está dañado o no es un libro válido.');
  }
  const sheets = {};
  for (const name of workbook.SheetNames) {
    sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: null });
  }
  return sheets;
}
/** Detecta el delimitador más probable de un CSV (coma o punto y coma). */
function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).slice(0, 10).join('\n');
  const commas = (sample.match(/,/g) ?? []).length;
  const semis = (sample.match(/;/g) ?? []).length;
  return semis > commas ? ';' : ',';
}
function csvToRows(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  let records;
  try {
    records = parseCsv(text, { delimiter: detectDelimiter(text), relax_column_count: true, relax_quotes: true, skip_empty_lines: false, trim: true });
  } catch (error) {
    throw new ParseError(`El CSV no se pudo interpretar: ${error.message}`);
  }
  // Las celdas se conservan como texto; `num()` del parser resuelve el formato numérico.
  return records.map((row) => row.map((cell) => (cell === '' ? null : cell)));
}
/**
 * Construye las hojas a partir de varios CSV, uno por hoja. El nombre de cada
 * archivo (sin extensión) debe coincidir con el nombre de la hoja:
 * "Seguidores.csv", "Interacciones SIN ADS.csv", etc.
 */
export function sheetsFromCsvFiles(files) {
  const conocidas = [...HOJAS_REQUERIDAS, ...HOJAS_OPCIONALES];
  const sheets = {};
  const desconocidos = [];
  for (const file of files) {
    const base = path.basename(file.originalname, path.extname(file.originalname));
    const nombre = conocidas.find((h) => normalizar(h) === normalizar(base) || normalizar(h).replace(/ /g, '_') === normalizar(base).replace(/ /g, '_'));
    if (!nombre) {
      desconocidos.push(file.originalname);
      continue;
    }
    sheets[nombre] = csvToRows(file.buffer);
  }
  if (desconocidos.length) {
    throw new ParseError(
      'Hay archivos CSV cuyo nombre no corresponde a ninguna hoja esperada.',
      desconocidos.map((n) => `Archivo no reconocido: ${n}. Nombres válidos: ${conocidas.join(', ')}.`),
    );
  }
  return sheets;
}
