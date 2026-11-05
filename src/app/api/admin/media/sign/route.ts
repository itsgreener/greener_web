import { NextResponse } from 'next/server'

import { adminApiGuard } from '@/lib/auth/adminSession'

import { signedUploads } from '@/modules/media/container'

export async function POST() {
  const denied = await adminApiGuard()

  if (denied) return denied

  return NextResponse.json(signedUploads.image())
}
