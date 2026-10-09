import { Shell } from '@/components/shell/Shell'
import { FeedProvider } from '@/components/masonry/FeedProvider'
import { AnalyticsProvider } from '@/modules/analytics/AnalyticsProvider'
import { env } from '@/lib/env'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AnalyticsProvider domain={env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}>
      <FeedProvider>
        <Shell>{children}</Shell>
      </FeedProvider>
    </AnalyticsProvider>
  )
}
