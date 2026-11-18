import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sheetsFromXlsx } from './loaders.js';
import { parseReport } from './parser.js';
const ROOT = path.resolve(import.meta.dirname, '../../../../..');
const LIBROS = [
  ['papelon', 'MONTALBAN-local/MONTALBAN-local/montalban_private/papelon.xlsx'],
  ['gella', 'MONTALBAN-local/MONTALBAN-local/montalban_private/gella.xlsx'],
  ['dulfit', 'MONTALBAN-local/MONTALBAN-local/montalban_private/dulfit.xlsx'],
  ['mimesa', 'MIMESA-local/MIMESA-local/mimesa_private/mimesa.xlsx'],
  ['sherwin', 'SHERWIN/SHERWIN/sherwin_private/sherwin.xlsx'],
];
describe('parseReport con los libros reales', () => {
  for (const [marca, rel] of LIBROS) {
    const file = path.join(ROOT, rel);
    it.skipIf(!fs.existsSync(file))(`procesa ${marca}`, () => {
      const started = performance.now();
      const report = parseReport(sheetsFromXlsx(fs.readFileSync(file)));
      const ms = performance.now() - started;
      const actual = report.meses.find((m) => m.mes === report.mesActual);
      console.log(
        `${marca}: mes=${report.mesActual} seguidores=${actual.seguidores} var=${actual.variacionSeguidores} meses=${report.meses.length} comp=${report.competidores.length} pubs=${report.publicaciones.length} hist=${report.historias.length} demo=${report.demografia.length} ${ms.toFixed(0)}ms`,
        report.advertencias,
      );
      expect(report.mesActual).toBeGreaterThan(0);
      expect(actual.seguidores).toBeGreaterThan(0);
      expect(report.demografia.length).toBe(10);
      // MIMESA no tiene competidores en Metricool (su dashboard omite la sección).
      if (marca !== 'mimesa') expect(report.competidores.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(30_000);
    });
  }
});
