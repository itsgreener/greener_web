import 'server-only'

import { FileScanRejectedError } from '@/modules/talent/domain/talentErrors'
import type { TalentVirusScanner } from '@/modules/talent/domain/talentPorts'
import { VirusScanError } from '@/modules/packages/domain/packageErrors'
import { scanFileForViruses } from '@/modules/packages/infrastructure/cloudmersiveVirusScan'

/**
 * El escaneo de Cloudmersive que ya protege los ZIP. Es bloqueante: si el
 * servicio no responde o no confirma que el fichero está limpio, no se acepta.
 * El motivo (virus o servicio caído) va al log; el candidato solo ve que el
 * fichero no se ha podido comprobar.
 */
export const cloudmersiveTalentScanner: TalentVirusScanner = {
  async scan(bytes, fileName) {
    try {
      await scanFileForViruses(Buffer.from(bytes), fileName)
    } catch (error) {
      if (error instanceof VirusScanError) {
        console.error('Talent: escaneo antivirus rechazado:', error.message)

        throw new FileScanRejectedError()
      }

      throw error
    }
  },
}
