import AdmZip from 'adm-zip'

import {
  orderPackageFiles,
  type PackageZipBuilder,
} from '@/modules/packages/domain/packageDownload'

/**
 * Construye el ZIP de una versión con `adm-zip` (la misma librería con la que
 * se lee al subirlo). Los ficheros entran como regulares (`-rw-r--r--`): sin
 * symlinks ni rutas raras, que la validación de la subida rechazaría.
 */
export const zipPackageBuilder: PackageZipBuilder = {
  build(files) {
    const zip = new AdmZip()

    for (const file of orderPackageFiles(files)) {
      zip.addFile(file.path, file.data)
    }

    return zip.toBuffer()
  },
}
