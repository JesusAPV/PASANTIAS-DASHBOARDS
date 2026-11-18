import { prisma } from './prisma.js';
export async function audit(req, operacion, extra = {}) {
  try {
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user?.id ?? null,
        operacion,
        entidad: extra.entidad ?? null,
        entidadId: extra.entidadId ?? null,
        detalles: extra.detalles ? JSON.parse(JSON.stringify(extra.detalles)) : undefined,
        ip: req.ip ?? null,
      },
    });
  } catch (error) {
    console.error('Auditoría no disponible:', error);
  }
}
