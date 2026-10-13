/**
 * Texto de la página «Privacy & Cookies» (`/privacy`). PROVISIONAL: parte del
 * documento «Política de cookies · Cookie Policy» de Greener (1 oct 2026) con
 * las correcciones técnicas de `politica-cookies-cambios.md`. El asesor legal
 * redacta el texto final: se sustituye aquí, sin tocar la página.
 *
 * Solo inglés por ahora (la web no tiene selector de idioma). Para añadir el
 * castellano, replica `POLICY` por idioma como en modules/consent/domain/copy.ts.
 *
 * Si cambia el contenido, sube `CONSENT_TEXT_VERSION` (modules/consent/domain/
 * consent.ts) al mismo valor que `lastUpdated`: así quien decidió con el texto
 * anterior vuelve a ver la ventana de cookies.
 */

export type PolicyBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'links'; items: { label: string; href: string }[] }

export interface PolicySection {
  id: string
  heading: string
  blocks: PolicyBlock[]
}

export interface PolicyDocument {
  title: string
  /** Fecha visible, y misma versión que `CONSENT_TEXT_VERSION`. */
  lastUpdated: string
  lastUpdatedIso: string
  sections: PolicySection[]
}

export const POLICY_EMAIL = 'hi@itsgreener.com'

export const POLICY: PolicyDocument = {
  title: 'Cookie Policy',
  lastUpdated: '1 October 2026',
  lastUpdatedIso: '2026-10-01',
  sections: [
    {
      id: 'who-we-are',
      heading: 'Who we are',
      blocks: [
        {
          type: 'p',
          text: `XAGA Creatividad Interactiva, S.A. ("Greener"), tax ID A64652639, registered at Carrer de l'Església 4-10, 08024 Barcelona, Spain. Write to us at ${POLICY_EMAIL} with any question about this policy.`,
        },
      ],
    },
    {
      id: 'what-a-cookie-is',
      heading: 'What a cookie is',
      blocks: [
        {
          type: 'p',
          text: 'A cookie is a small file a website saves on your device when you visit, used to remember information about your visit. The same legal concept covers other forms of browser storage, such as local and session storage, which this site does use.',
        },
      ],
    },
    {
      id: 'what-we-use',
      heading: 'What we use on this site',
      blocks: [
        {
          type: 'p',
          text: 'This site is built to work with the least storage possible. We use no advertising, profiling, personalisation or cross-site tracking cookies. We do not sell or transfer data to third parties for commercial purposes. No account is needed to reach any content.',
        },
      ],
    },
    {
      id: 'necessary-storage',
      heading: 'Strictly necessary storage',
      blocks: [
        {
          type: 'table',
          head: ['Name', 'Type', 'Owner', 'Purpose', 'Duration'],
          rows: [
            [
              'greener:feed',
              'Session storage',
              'Greener',
              'Keeps the home page as you left it during your visit (which pieces were loaded and where you had scrolled to), so that returning from a piece of content brings you back to the same place. It contains no personal data.',
              'Until you close the tab',
            ],
            [
              'greener_visitor',
              'Cookie',
              'Greener',
              'Limits how many requests a single browser can make to the site, to prevent abuse and automated traffic. It holds a random code that is not linked to your identity or to any account.',
              '24 hours, renewed while you browse',
            ],
            [
              'greener_consent',
              'Cookie',
              'Greener',
              'Remembers your cookie choice, and the date and version of the text you saw, so that we do not ask you again.',
              '24 months',
            ],
          ],
        },
        {
          type: 'p',
          text: 'This storage is essential to provide the service you requested and, under article 22.2 of Spanish Law 34/2002, requires no consent.',
        },
      ],
    },
    {
      id: 'audience-measurement',
      heading: 'Audience measurement',
      blocks: [
        {
          type: 'p',
          text: 'We use Plausible Analytics to know how many people visit the site and which content they read. Plausible sets no cookies, writes nothing to your device, builds no profiles and cannot identify any visitor. Data is aggregated and hosted in the European Union.',
        },
        {
          type: 'p',
          text: 'We also count, without identifying anyone, how many visitors accept, reject or close this window, so that we can tell whether it works.',
        },
      ],
    },
    {
      id: 'images-and-media',
      heading: 'Images and video on the site',
      blocks: [
        {
          type: 'p',
          text: 'The images and videos shown on the site are served by Cloudinary. To deliver them, Cloudinary receives your IP address and the usual technical details of your browser request.',
        },
      ],
    },
    {
      id: 'third-party-video',
      heading: 'Third-party video',
      blocks: [
        {
          type: 'p',
          text: 'The Channel section shows episodes hosted on YouTube and Spotify. Until you accept cookies and press play, nothing is requested from those providers: you only see a cover image from Greener. Once you accept and play an episode, your browser connects to the provider, which receives your IP address and sets its own cookies and similar technologies on your device, over which Greener has no control. If you do not accept cookies, we load no player at all.',
        },
        {
          type: 'p',
          text: 'You can read how each provider handles your data in its own policy:',
        },
        {
          type: 'links',
          items: [
            {
              label: 'Google (YouTube)',
              href: 'https://policies.google.com/privacy',
            },
            {
              label: 'Spotify',
              href: 'https://www.spotify.com/legal/privacy-policy/',
            },
          ],
        },
      ],
    },
    {
      id: 'changing-your-choice',
      heading: 'Changing your choice',
      blocks: [
        {
          type: 'p',
          text: 'You can withdraw or change your consent at any time in the "Your cookie choice" section at the top of this page, which you reach from "Privacy & Cookies" in the menu, as easily as you gave it.',
        },
        {
          type: 'p',
          text: 'You can also block or delete cookies through your browser settings. Blocking strictly necessary storage may affect how the site works.',
        },
      ],
    },
    {
      id: 'your-rights',
      heading: 'Your rights',
      blocks: [
        {
          type: 'p',
          text: `You can exercise your rights of access, rectification, erasure, objection, restriction and portability by writing to ${POLICY_EMAIL}. You may also lodge a complaint with the Spanish Data Protection Agency (www.aepd.es).`,
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to this policy',
      blocks: [
        {
          type: 'p',
          text: 'We may update this policy when the tools the site uses change, or when applicable law does. The date of the last update appears at the top of this page.',
        },
      ],
    },
  ],
}
