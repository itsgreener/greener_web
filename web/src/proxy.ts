import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  console.log('🔥 PROXY EJECUTADO:', request.nextUrl.pathname)

  return await updateSession(request)
}

export const config = {
  matcher: ['/admin/:path*'],
}