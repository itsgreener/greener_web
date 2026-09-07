import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import { createSignedVideoUpload } from '@/modules/media/infrastructure/cloudinaryServer'

export async function POST() {
  const supabase = await createClient()

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()

  if (claimsError || !claimsData?.claims) {
    return NextResponse.json(
      {
        error: 'No autenticado',
      },
      {
        status: 401,
      },
    )
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')

  if (adminError || !isAdmin) {
    return NextResponse.json(
      {
        error: 'No autorizado',
      },
      {
        status: 403,
      },
    )
  }

  return NextResponse.json(createSignedVideoUpload())
}
