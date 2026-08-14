'use client'

import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {

  const loginWithGoogle = async () => {
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          `${window.location.origin}/auth/callback?next=/admin`,
      },
    })

    if (error) {
      console.error(error)
    }
  }

  return (
    <main>
      <h1>Greener Admin</h1>

      <button onClick={loginWithGoogle}>
        Entrar con Google
      </button>
    </main>
  )
}