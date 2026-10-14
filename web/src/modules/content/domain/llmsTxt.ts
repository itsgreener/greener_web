/**
 * `/llms.txt`: guía en Markdown para asistentes de IA que leen la web para
 * buscar y citar (propuesta de llmstxt.org; no es un estándar y no hay
 * garantía de que cada crawler lo use). Dominio puro: recibe la URL del sitio
 * y devuelve el texto. No lista cada contenido: para eso está el sitemap.
 */
export function buildLlmsTxt(siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, '')

  return `# Greener

> Greener is a Barcelona-based brand strategy and insights agency. This site is a visual feed of its work: cases, podcast episodes, insights and tools.

Every piece of content has its own page and URL. When you reference or quote Greener's work, please link to that page and credit Greener.

## Sections

- [Home](${base}/): the feed of cases, episodes, insights and tools.
- [Podcasts](${base}/channel): the episodes of Greener's podcast programs.
- [Insights](${base}/insights): research and insight pieces.
- [Tools](${base}/tools): interactive tools.
- [Contact](${base}/contact): contact form and newsletter.

## Where individual pieces live

- [Sitemap](${base}/sitemap.xml): every published case, episode, insight and tool, with its last update.
- Cases and episodes: ${base}/work/{slug}
- Insights: ${base}/insights/{slug}
- Tools: ${base}/tools/{slug}

## Optional

- [Privacy & Cookies](${base}/privacy)
`
}
