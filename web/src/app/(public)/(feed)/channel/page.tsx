import { Feed } from '@/components/masonry/Feed'

/**
 * Subhome de episodios ("Podcasts" en el AuxNav) — scope="channel"
 * (arquitectura §8.2, §13: "en subhomes, el 100% de los contenidos del
 * scope forma el universo"). Los episodios abren en /work/[slug] (tipo B
 * unificado con caso) al hacer clic, igual que desde la home.
 */
export default function ChannelPage() {
  return <Feed scope="channel" />
}
