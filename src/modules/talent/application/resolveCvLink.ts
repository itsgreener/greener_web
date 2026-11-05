import { CV_SIGNED_URL_SECONDS } from '@/modules/talent/domain/talentConstants'
import type {
  CvLocationKind,
  CvTarget,
} from '@/modules/talent/domain/talentAdminModels'
import {
  classifyCvLocation,
  externalCvUrl,
} from '@/modules/talent/domain/talentCvLocation'
import type {
  TalentAdminRepository,
  TalentFileStorage,
} from '@/modules/talent/domain/talentPorts'

export type ResolveCvLinkResult =
  | { ok: true; url: string; kind: CvLocationKind }
  | { ok: false; reason: 'not_found' | 'unavailable' }

/**
 * Convierte «el CV de este candidato» (o «este fichero suyo») en una URL a la
 * que redirigir al personal:
 * - en el bucket: URL firmada de 60 s;
 * - en Drive o en otro sitio: el enlace guardado, si es http(s) (lo gobierna
 *   el propietario del enlace, no hay firma que dar).
 *
 * La ruta sale de la base de datos a partir de los ids; nunca se acepta una
 * ruta del navegador, para que nadie pida la firma de un objeto ajeno.
 */
export function makeResolveCvLink({
  admin,
  storage,
}: {
  admin: TalentAdminRepository
  storage: TalentFileStorage
}) {
  return async function resolveCvLink(
    target: CvTarget,
  ): Promise<ResolveCvLinkResult> {
    try {
      const path = await admin.findStoredPath(target.candidateId, target.fileId)
      const kind = classifyCvLocation(path)

      if (!path || kind === 'none') return { ok: false, reason: 'not_found' }

      if (kind === 'bucket') {
        const url = await storage.createSignedUrl(path, CV_SIGNED_URL_SECONDS)

        return { ok: true, url, kind }
      }

      const url = externalCvUrl(path)

      return url ? { ok: true, url, kind } : { ok: false, reason: 'not_found' }
    } catch (error) {
      console.error('Talent: no se pudo resolver el enlace del CV', error)

      return { ok: false, reason: 'unavailable' }
    }
  }
}
