import 'dotenv/config';
import path from 'node:path';
function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}
function int(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: int('PORT', 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  sessionIdleMinutes: int('SESSION_IDLE_MINUTES', 60),
  sessionWarningMinutes: int('SESSION_WARNING_MINUTES', 5),
  uploadsDir: path.resolve(process.env.UPLOADS_DIR ?? './storage/uploads'),
  reportsDir: path.resolve(process.env.REPORTS_DIR ?? './storage/reports'),
  maxImageBytes: int('MAX_IMAGE_MB', 5) * 1024 * 1024,
  cookieName: 'mds_session',
};
