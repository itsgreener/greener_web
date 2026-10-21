/**
 * Texto de la página «Privacy & Cookies» (`/privacy`). Es el texto definitivo
 * del asesor legal (documento P26096, versión del 19 de octubre de 2026, basada
 * en la auditoría de cookies del 15 y 16 de octubre), con los añadidos que pidió
 * Greener el 19 de octubre y que el asesor aún tiene que dar por buenos
 * (`docs/cookies-y-privacidad/politica-cookies-cambios.md`, §«Añadidos
 * pendientes de visto bueno»): el servicio de correo de Dinahosting, el campo
 * de error del registro antiabuso y los registros de seguridad del servidor.
 *
 * Solo inglés por ahora (la web no tiene selector de idioma; el asesor entregó
 * también la versión en castellano, equivalente). Para añadir el castellano,
 * replica `POLICY` por idioma como en modules/consent/domain/copy.ts.
 *
 * Estructura: una sola página con dos partes ancladas, `#privacy` y `#cookies`
 * (los enlaces del formulario de contacto, de la ventana de cookies y del aviso
 * del reproductor apuntan a ellas), y `#newsletter`, a la que enlaza la
 * tarjeta de newsletter del feed. El bloque «Your cookie choice»
 * (`#cookie-choice`) lo pinta la página, no este fichero.
 *
 * Si cambia el contenido, sube `CONSENT_TEXT_VERSION` (modules/consent/domain/
 * consent.ts) al mismo valor que `lastUpdatedIso`: así quien decidió con el
 * texto anterior vuelve a ver la ventana de cookies. Los nombres de botones y
 * bloques que cita el texto («Accept», «Reject», «Accept cookies and play»,
 * «Not now», «Your cookie choice», «Privacy & Cookies») tienen que coincidir
 * con la interfaz.
 */

export type PolicyListItem = string | { label: string; text: string }

export type PolicyBlock =
  | { type: 'p'; text: string }
  | { type: 'note'; text: string }
  | { type: 'list'; items: PolicyListItem[] }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'links'; items: { label: string; href: string }[] }

export interface PolicySection {
  id: string
  heading: string
  /** 2 = apartado principal (por defecto); 3 = subapartado de una parte. */
  level?: 2 | 3
  blocks: PolicyBlock[]
}

export interface PolicyDocument {
  /** Fecha visible, y misma versión que `CONSENT_TEXT_VERSION`. */
  lastUpdated: string
  lastUpdatedIso: string
  intro: string
  sections: PolicySection[]
}

const POLICY_EMAIL = 'hi@itsgreener.com'

export const POLICY: PolicyDocument = {
  lastUpdated: '19 October 2026',
  lastUpdatedIso: '2026-10-19',
  intro:
    'This page explains which personal data Greener processes when you visit this site, write to us or subscribe to the newsletter (privacy policy), and what the site stores on your device (cookie policy).',
  sections: [
    {
      id: 'who-we-are',
      heading: 'Who we are',
      blocks: [
        {
          type: 'p',
          text: `XAGA Creatividad Interactiva, S.A. ("Greener"), tax ID A64652639, registered at Carrer de l'Església 4-10, 08024 Barcelona, Spain. Write to us at ${POLICY_EMAIL} with any question about this policy or your data.`,
        },
      ],
    },

    // ───────────────────────── Política de privacidad ─────────────────────────
    {
      id: 'privacy',
      heading: 'Privacy policy',
      blocks: [
        {
          type: 'p',
          text: "This site is a space for content: cases, insights, tools and video and podcast episodes. You don't need an account to see anything. We only process the personal data you give us when you write to us or subscribe to the newsletter, and the technical data the site needs to work securely.",
        },
      ],
    },
    {
      id: 'contact-form',
      level: 3,
      heading: 'Contact form',
      blocks: [
        {
          type: 'list',
          items: [
            {
              label: 'What we collect:',
              text: 'your name, phone number, email address and message.',
            },
            {
              label: 'Why, and on what legal basis:',
              text: 'to deal with your enquiry and reply to you. The basis is your own request (article 6.1.b GDPR) and, if it leads to no professional relationship, our legitimate interest in replying to people who write to us (article 6.1.f GDPR). We cannot reply without the required fields.',
            },
            {
              label: 'Where it goes:',
              text: 'the form does not store your name, phone number, email address or message in the site\'s database (the only record it keeps is the one described under "Protecting the form from abuse"). It sends them by email through the mail service of our hosting provider, Dinahosting, which delivers them to Greener\'s inbox, hosted on Google Workspace.',
            },
            {
              label: 'How long:',
              text: 'if your message leads to no professional relationship, we keep it for 12 months from our last exchange. If it does, for as long as that relationship lasts and then for the periods the law requires.',
            },
          ],
        },
      ],
    },
    {
      id: 'form-abuse',
      level: 3,
      heading: 'Protecting the form from abuse',
      blocks: [
        {
          type: 'p',
          text: 'To stop mass or automated submissions, the form accepts at most five submissions per hour from the same connection. To enforce this we store, with the date and outcome of each submission, a code derived from your IP address through a one-way function: we do not store the IP address itself. If a submission cannot be sent, we also store the technical error message returned by the mail server so we can fix the fault; on rare occasions that message may include the email address you entered. The legal basis is our legitimate interest in protecting the site and the form, and these records are deleted automatically after 30 days.',
        },
      ],
    },
    {
      id: 'newsletter',
      level: 3,
      heading: 'Newsletter',
      blocks: [
        {
          type: 'p',
          text: 'If you subscribe from the card shown in the feed:',
        },
        {
          type: 'list',
          items: [
            {
              label: 'What we collect:',
              text: 'your email address, the label "Greener Website", which shows you subscribed from this site, and the record of your consent that Mailchimp keeps when you confirm.',
            },
            {
              label: 'Why, and on what legal basis:',
              text: "to send you Greener's newsletter, with your consent (article 6.1.a GDPR).",
            },
            {
              label: 'How you subscribe:',
              text: 'we send you an email asking you to confirm. Your subscription is not active until you do (double opt-in).',
            },
            {
              label: 'How long:',
              text: 'until you unsubscribe, which you can do from any newsletter or by writing to us.',
            },
            {
              label: 'No Mailchimp on the site:',
              text: 'your subscription travels from our server to Mailchimp. The site loads no Mailchimp script or form, so Mailchimp sets no cookie on your device through it.',
            },
          ],
        },
        {
          type: 'p',
          text: 'We count how many people subscribe with an anonymous Plausible event that does not identify you. Once you subscribe, the site also saves the greener_newsletter cookie so the card is not shown to you again (see "Our own storage").',
        },
      ],
    },
    {
      id: 'audience-measurement',
      level: 3,
      heading: 'Audience measurement',
      blocks: [
        {
          type: 'p',
          text: 'We use Plausible Analytics to know how many people visit the site and which content they see. Plausible sets no cookies, stores nothing on your device, builds no profiles and cannot identify you: it only gives us aggregate statistics. To count visits without identifying anyone, it combines your IP address and browser details into a code that changes every day, so you cannot be followed from one day to the next; neither the IP address nor those details are stored. Plausible Insights OÜ is a European Union company that hosts the data in Germany and keeps it within the EU. We keep the statistics for as long as we use the service. The legal basis is our legitimate interest in understanding how the site is used in order to improve it.',
        },
      ],
    },
    {
      id: 'browsing',
      level: 3,
      heading: 'Browsing the site',
      blocks: [
        {
          type: 'p',
          text: 'To show you the site, our hosting provider and Cloudinary, the service that delivers our own images and videos, receive your IP address and the usual technical details of each request your browser makes. The site cannot work without them; the legal basis is our legitimate interest in running it securely. The Instagram, YouTube and LinkedIn items in the menu are plain links: the site loads no buttons or scripts from those networks.',
        },
        {
          type: 'p',
          text: 'If you accept cookies and play an episode, YouTube or Spotify receive your data directly and handle it under their own policies (see "Video and podcast players").',
        },
      ],
    },
    {
      id: 'security-logs',
      level: 3,
      heading: 'Security logs',
      blocks: [
        {
          type: 'p',
          text: "To protect the site from bots and vulnerability scanners, our server keeps a log of requests to addresses that no real visitor ever opens: a decoy page hidden from people, and the typical paths scanners probe (such as .php files or .env files, which this site does not have). For each of those requests the log records the address requested, your IP address and your browser's user agent. We use these records only to detect and block abusive traffic. The legal basis is our legitimate interest in the security of the site, and the records are deleted automatically from the server's logs after 30 days.",
        },
      ],
    },
    {
      id: 'processors',
      level: 3,
      heading: 'Who else processes your data',
      blocks: [
        {
          type: 'p',
          text: "These providers process data on Greener's behalf, only to provide their service to us and with the safeguards the GDPR requires:",
        },
        {
          type: 'list',
          items: [
            'Dinahosting: site hosting and the mail service that delivers contact-form messages to our inbox.',
            "Supabase: the site's database, including the form's abuse-prevention log.",
            'Cloudinary: image and video delivery.',
            'Plausible Analytics: audience measurement.',
            'Mailchimp (Intuit Inc.): newsletter management and delivery.',
            'Google Workspace (Google): the mailbox where we receive contact-form messages.',
          ],
        },
        {
          type: 'p',
          text: "YouTube, owned by Google, and Spotify do not work on Greener's behalf: if you accept their players, they process your data as controllers, under their own policies. We do not sell your data or share it with third parties for commercial purposes; we would only disclose it to an authority if the law required us to.",
        },
      ],
    },
    {
      id: 'transfers',
      level: 3,
      heading: 'International transfers',
      blocks: [
        {
          type: 'p',
          text: 'Some of these providers, such as Google Workspace, Mailchimp, Cloudinary or Supabase, may process your data outside the European Economic Area. When that happens, the transfer relies on appropriate safeguards: an adequacy decision of the European Commission, such as the EU-US Data Privacy Framework, or the standard contractual clauses approved by the Commission.',
        },
        {
          type: 'p',
          text: "If you accept the players, Google and Spotify may also process your data outside the European Economic Area under their policies; Spotify's player, for example, sends error reports to a service in the United States (Sentry).",
        },
        {
          type: 'p',
          text: `You can ask us for more information about these safeguards at ${POLICY_EMAIL}.`,
        },
      ],
    },

    // ───────────────────────────── Política de cookies ─────────────────────────
    {
      id: 'cookies',
      heading: 'Cookie policy',
      blocks: [],
    },
    {
      id: 'what-a-cookie-is',
      level: 3,
      heading: 'What a cookie is',
      blocks: [
        {
          type: 'p',
          text: 'A cookie is a small file a website saves on your device when you visit, to remember information about your visit. The law treats other forms of browser storage, such as local and session storage, the same way, so this policy covers them all.',
        },
      ],
    },
    {
      id: 'what-this-site-stores',
      level: 3,
      heading: 'What this site stores',
      blocks: [
        {
          type: 'p',
          text: 'This site is built to work with the least storage possible and uses no advertising, profiling or cross-site tracking cookies. It stores four items of its own, none of them with personal data. Third-party video and podcast players add their own, and only if you accept them and press play.',
        },
      ],
    },
    {
      id: 'own-storage',
      level: 3,
      heading: 'Our own storage',
      blocks: [
        {
          type: 'table',
          head: ['Name', 'Type', 'Purpose', 'Duration'],
          rows: [
            [
              'greener_visitor',
              'Cookie',
              'Security: limiting abusive or automated requests to the site. It holds a random code not linked to any person or account.',
              '24 hours, renewed while you browse',
            ],
            [
              'greener:feed',
              'Session storage',
              'Remembering your place in the feed, so that coming back from a piece of content brings you to where you left off.',
              'Until you close the tab',
            ],
            [
              'greener_consent',
              'Cookie',
              'Remembering your cookie choice: the decision, the version of the text you saw and the date.',
              'Up to 24 months (*)',
            ],
            [
              'greener_newsletter',
              'Cookie',
              'Not showing you the newsletter card again. It holds the value "1", no email address and no identifier, and is only set after you subscribe.',
              '12 months',
            ],
          ],
        },
        {
          type: 'note',
          text: '(*) This is the maximum: your browser may shorten it (some cap it at around 13 months, others at 7 days). If so, we will simply ask you again sooner.',
        },
        {
          type: 'p',
          text: "This storage serves the site's security, functions you ask for or your preferences, so it requires no consent under article 22.2 of Spanish Law 34/2002 on information society services. You ask for the greener_newsletter cookie by subscribing, and it does not depend on your cookie choice.",
        },
      ],
    },
    {
      id: 'measurement-and-images',
      level: 3,
      heading: 'Audience measurement and images',
      blocks: [
        {
          type: 'p',
          text: 'Plausible Analytics sets no cookies and stores nothing on your device, and Cloudinary, which delivers the site\'s own images and videos, sets no cookies (see "Audience measurement" and "Browsing the site"). We also count, without identifying anyone, how many visitors accept, reject or close the cookie window, so we can tell whether it works.',
        },
      ],
    },
    {
      id: 'third-party-video',
      level: 3,
      heading: 'Video and podcast players',
      blocks: [
        {
          type: 'p',
          text: 'The episodes in the Channel section are hosted on YouTube and Spotify. Until you accept cookies and press play, the site makes no request to those providers: you only see a cover image from Greener. Once you accept and play an episode, your browser connects to the provider, which receives your IP address and technical and usage data from the player, and saves its own cookies and other data on your device to run the player, measure its use and protect its service. Greener has no control over that storage or over what the provider does with the data.',
        },
        {
          type: 'p',
          text: 'YouTube loads in its privacy-enhanced mode (youtube-nocookie.com), which reduces what it stores on your device but does not remove it.',
        },
        {
          type: 'p',
          text: 'This is what they stored at our last review, in October 2026. Providers can change it without notice, so their own policies are the reference.',
        },
        {
          type: 'table',
          head: ['Name', 'Type', 'Owner', 'Duration'],
          rows: [
            ['sp_t', 'Cookie', 'Spotify (spotify.com)', '1 year'],
            ['sp_landing', 'Cookie', 'Spotify (spotify.com)', '1 day'],
            [
              'sentryReplaySession',
              'Session storage',
              'Spotify (open.spotify.com)',
              'Until you close the tab',
            ],
            [
              'yt-player-caption-persistence',
              'Local storage',
              'YouTube (youtube-nocookie.com)',
              "Until you clear the site's data",
            ],
            [
              'yt-icons-last-purged',
              'Local storage',
              'YouTube (youtube-nocookie.com)',
              "Until you clear the site's data",
            ],
            [
              'ytidb::LAST_RESULT_ENTRY_KEY',
              'Local storage',
              'YouTube (youtube-nocookie.com)',
              "Until you clear the site's data",
            ],
            [
              'YtIdbMeta',
              'IndexedDB',
              'YouTube (youtube-nocookie.com)',
              "Until you clear the site's data",
            ],
          ],
        },
        {
          type: 'p',
          text: "Providers' cookie policies:",
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
      id: 'how-your-choice-works',
      level: 3,
      heading: 'How your choice works',
      blocks: [
        {
          type: 'p',
          text: 'We ask you for one decision only: whether you allow third-party video and podcast players. It applies to every episode on the site.',
        },
        {
          type: 'list',
          items: [
            'The cookie window appears at the bottom of the screen and does not stop you browsing. Only "Accept", "Reject" or the X close it; scrolling, clicking outside it or pressing Escape do not count as a decision.',
            'Accepting and rejecting take the same effort: one click. Closing with the X counts as rejecting.',
            'If you accept, you allow every player until you change your mind, the greener_consent cookie expires or we update this policy; we will then ask you again.',
            'Even after you accept, no player loads until you press play.',
            'If you rejected or have not decided yet, pressing play on an episode asks you there and then, naming the provider that will load ("Accept cookies and play" / "Not now").',
          ],
        },
      ],
    },
    {
      id: 'changing-your-choice',
      level: 3,
      heading: 'Changing or withdrawing your choice',
      blocks: [
        {
          type: 'p',
          text: 'You can change your decision at any time, as easily as you made it, in the "Your cookie choice" block at the top of this page, which you reach from "Privacy & Cookies" in the menu.',
        },
        {
          type: 'p',
          text: 'When you withdraw it, the player disappears at once and does not load again until you accept. Anything YouTube or Spotify had already saved on your device, however, stays there until you delete it: you can do so in your browser settings, by clearing the site data for youtube-nocookie.com and spotify.com, or all cookies and site data.',
        },
        {
          type: 'p',
          text: "You can also block or delete cookies in your browser at any time. If you block the site's own storage, some features may stop working properly.",
        },
      ],
    },

    // ───────────────────────────── Cierre (ambas partes) ───────────────────────
    {
      id: 'your-rights',
      heading: 'Your rights',
      blocks: [
        {
          type: 'p',
          text: `You can ask us for access to your data, its rectification or erasure, object to its processing, ask us to restrict it and request its portability by writing to ${POLICY_EMAIL}. Where processing is based on your consent, you can withdraw it at any time, without affecting what was done before. We make no automated decisions and build no profiles with your data.`,
        },
        {
          type: 'p',
          text: 'If you feel we have not handled your request properly, you can lodge a complaint with the Spanish Data Protection Agency (www.aepd.es).',
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to this policy',
      blocks: [
        {
          type: 'p',
          text: 'We will update this policy when the tools the site uses or the law change. The date of the last update appears at the top of the page and also serves as the version of your cookie choice: each time we update it, we ask you again.',
        },
      ],
    },
  ],
}
