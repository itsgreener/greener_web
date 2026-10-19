import 'server-only'

import { getTalentMailchimpEnv } from '@/lib/serverEnv'
import { subscribeEmailInMailchimp } from '@/modules/newsletter/infrastructure/mailchimpNewsletter'
import type { TalentNewsletter } from '@/modules/talent/domain/talentPorts'

/** Etiqueta con la que entran los candidatos en la audiencia de talent. */
export const TALENT_MAILCHIMP_TAG = 'Greener Talent'

/**
 * Alta en la audiencia de talent con el módulo de newsletter de la web: misma
 * cuenta (clave de API y prefijo), otra audiencia. Conserva el doble opt-in
 * y el tiempo máximo de 8 s. Sustituye a la función `subscribe-mailchimp` de
 * Supabase-talent, que se retira en la fase 4.
 */
export const talentMailchimpNewsletter: TalentNewsletter = {
  async subscribe(email) {
    await subscribeEmailInMailchimp(email, {
      audienceId: getTalentMailchimpEnv().TALENT_MAILCHIMP_AUDIENCE_ID,
      tag: TALENT_MAILCHIMP_TAG,
    })
  },
}
