'use client'

import Link from 'next/link'
import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loginWithGoogle = async () => {
    setLoading(true)
    setErrorMessage(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      },
    })

    if (error) {
      console.error(error)

      setErrorMessage(
        'No se ha podido iniciar sesión con Google. Inténtalo de nuevo.',
      )

      setLoading(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-brand">
          <div className="admin-login-brand-name">Greener</div>

          <div className="admin-login-brand-label">Admin</div>
        </div>

        <div className="admin-login-content">
          <div className="admin-login-heading">
            <p className="admin-page-eyebrow">Panel de administración</p>

            <h1>Bienvenido</h1>

            <p>
              Accede para gestionar contenidos, publicaciones, herramientas y
              recursos de Greener.
            </p>
          </div>

          <button
            type="button"
            className="admin-google-button"
            onClick={loginWithGoogle}
            disabled={loading}
          >
            <span className="admin-google-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                role="presentation"
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.38Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.97-.9 6.62-2.39l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.39 13.93A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.48H3.04A10 10 0 0 0 2 12c0 1.62.39 3.15 1.04 4.52l3.35-2.59Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.97 2.96 14.7 2 12 2a10 10 0 0 0-8.96 5.48l3.35 2.59C7.18 7.7 9.39 5.94 12 5.94Z"
                />
              </svg>
            </span>

            <span>
              {loading ? 'Conectando con Google...' : 'Continuar con Google'}
            </span>
          </button>

          {errorMessage && (
            <div className="admin-login-error" role="alert">
              {errorMessage}
            </div>
          )}

          <div className="admin-login-security">
            <span aria-hidden="true">✓</span>

            <p>
              Utiliza una cuenta corporativa autorizada para acceder al panel.
            </p>
          </div>
        </div>

        <footer className="admin-login-footer">
          <Link href="/">← Volver a la web</Link>

          <span>Greener Admin</span>
        </footer>
      </section>
    </main>
  )
}
