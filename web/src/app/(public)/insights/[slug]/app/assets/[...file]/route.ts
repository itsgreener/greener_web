import { NextRequest, NextResponse } from 'next/server'

import {
  getStoragePackageAsset,
} from '@/modules/packages/infrastructure/supabaseStorageSource'

import {
  buildAssetResponse,
} from '@/modules/packages/infrastructure/assetResponse'

import {
  PackageNotFoundError,
} from '@/modules/packages/domain/manifest'

/**
 * Sirve los assets de un insight bajo:
 *
 * /insights/[slug]/app/assets/*
 *
 * La carpeta `assets` forma parte de la estructura física del paquete
 * en Storage, pero Next.js ya la consume como segmento fijo de esta
 * ruta. Por eso debemos volver a añadirla antes de consultar Storage.
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      slug: string
      file: string[]
    }>
  },
) {
  const {
    slug,
    file,
  } = await params

  try {
    const asset =
      await getStoragePackageAsset(
        'insight',
        slug,
        [
          'assets',
          ...file,
        ],
        request.headers.get(
          'if-none-match',
        ),
      )

    return buildAssetResponse(
      asset,
      file[
        file.length - 1
      ] ?? '',
    )
  } catch (error) {
    if (
      error instanceof
      PackageNotFoundError
    ) {
      return new NextResponse(
        'Asset no encontrado',
        {
          status: 404,
        },
      )
    }

    throw error
  }
}