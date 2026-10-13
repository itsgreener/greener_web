import 'server-only'

import { getHashedClientIp } from '@/lib/http/clientIp'

import { makeSubmitContactForm } from './application/submitContactForm'
import { supabaseContactSubmissionLog } from './infrastructure/contactSubmissionLog'
import { smtpContactMailer } from './infrastructure/mailer'

/** Composition root del formulario de contacto. Ver `media/container.ts`. */

export const submitContactForm = makeSubmitContactForm({
  mailer: smtpContactMailer,
  log: supabaseContactSubmissionLog,
  clientKey: getHashedClientIp,
})
