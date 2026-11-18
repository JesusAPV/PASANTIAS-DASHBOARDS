const nf = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 });

export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return decimals ? n.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : nf.format(n);
}

export function formatPercentage(value, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return `${Number(value).toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}

export function formatSigned(value) {
  if (value === null || value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${formatNumber(value)}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  return iso ? new Date(iso).toLocaleString('es-VE') : '—';
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export const last = (arr) => arr?.[arr.length - 1];
export const prev = (arr) => arr?.[arr.length - 2];
export const hoyISO = () => new Date().toISOString().slice(0, 10);
