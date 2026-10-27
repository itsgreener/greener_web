/**
 * Texto legal de la petición de consentimiento previa al reproductor de un
 * episodio (guía de la AEPD, mayo de 2024, §3.2.3 d). Vive aparte del
 * componente para que el asesor pueda revisarlo y cambiarlo sin tocar el
 * JSX; `privacy.smoke` vigila que los textos de los botones coincidan con
 * los de `/privacy`.
 */
export function embedConsentCopy(provider: string) {
  return {
    title: `${provider} content`,
    intro:
      `This content is served by ${provider}. Nothing is loaded from ` +
      `${provider} until you accept cookies. If you accept, your browser ` +
      `connects to ${provider}, which receives your IP address and uses ` +
      'cookies and similar technologies of its own to deliver the player ' +
      'and for its own purposes, as described in its privacy policy.',
    remembered:
      'Your choice is remembered, and you can change it at any time on the ' +
      'Privacy & Cookies page.',
    policyLink: 'Privacy & Cookies',
    accept: 'Accept cookies and play',
    cancel: 'Not now',
  }
}
