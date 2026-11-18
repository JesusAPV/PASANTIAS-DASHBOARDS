export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const SESSION_EVENT = 'mds:session';

/**
 * Cliente HTTP de la API.
 * @param {string} path Ruta relativa a /api.
 * @param {object} options fetch options + { body, passive }.
 *   `passive: true` marca la petición como sondeo automático (no renueva la sesión).
 */
export async function api(path, options = {}) {
  const { body, passive, headers, ...rest } = options;
  const h = new Headers(headers ?? {});
  const init = { credentials: 'same-origin', cache: 'no-store', ...rest, headers: h };
  if (passive) h.set('X-Passive', '1');
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    h.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError(navigator.onLine === false ? 'Sin conexión a internet.' : 'No se pudo conectar con el servidor.', 0, 'network_error');
  }

  const expires = response.headers.get('X-Session-Expires');
  if (expires) window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { expiraEn: expires } }));

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { expired: true, code: payload.code } }));
    throw new ApiError(String(payload.error ?? 'No se pudo completar la solicitud.'), response.status, String(payload.code ?? 'request_error'), payload.details);
  }
  return payload;
}
