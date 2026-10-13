import { CookieBanner } from '@/components/consent/CookieBanner'
import { Shell } from '@/components/shell/Shell'
import { FeedProvider } from '@/components/masonry/FeedProvider'
import { AnalyticsProvider } from '@/modules/analytics/AnalyticsProvider'
import { ConsentProvider } from '@/modules/consent/client/ConsentProvider'
import { env } from '@/lib/env'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AnalyticsProvider domain={env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}>
      <ConsentProvider>
        <FeedProvider>
          <Shell>{children}</Shell>
        </FeedProvider>
        <CookieBanner />
      </ConsentProvider>
    </AnalyticsProvider>
  )
}
