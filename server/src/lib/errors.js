import { ZodError } from 'zod';
import { MulterError } from 'multer';
export class HttpError extends Error {
  status;
  code;
  details;
  constructor(status, message, code = 'error', details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export const badRequest = (message, details) => new HttpError(400, message, 'bad_request', details);
export const unauthorized = (message = 'Debes iniciar sesión.', code = 'authentication_required') => new HttpError(401, message, code);
export const forbidden = (message = 'No tienes permiso para esta operación.') => new HttpError(403, message, 'forbidden');
export const notFound = (message = 'Recurso no encontrado.') => new HttpError(404, message, 'not_found');
export const conflict = (message, details) => new HttpError(409, message, 'conflict', details);
export const unprocessable = (message, details) => new HttpError(422, message, 'validation_error', details);
export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ ok: false, error: error.message, code: error.code, details: error.details });
    return;
  }
  if (error instanceof MulterError) {
    res.status(422).json({ ok: false, error: `Archivo rechazado: ${error.message}.`, code: 'upload_error', details: error.code });
    return;
  }
  if (error instanceof ZodError) {
    res.status(422).json({ ok: false, error: 'Datos inválidos.', code: 'validation_error', details: error.issues });
    return;
  }
  console.error(error);
  res.status(500).json({ ok: false, error: 'Ocurrió un error interno.', code: 'server_error' });
}
export const asyncHandler = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};
