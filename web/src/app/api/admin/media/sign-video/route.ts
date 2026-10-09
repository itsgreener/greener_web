import { NextResponse } from 'next/server'

import { adminApiGuard } from '@/lib/auth/adminSession'

import { createSignedVideoUpload } from '@/modules/media/infrastructure/cloudinaryServer'

export async function POST() {
  const denied = await adminApiGuard()

  if (denied) return denied

  return NextResponse.json(createSignedVideoUpload())
}
