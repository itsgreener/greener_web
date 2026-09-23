import {
  AnalyticsProvider,
} from '@/modules/analytics/AnalyticsProvider'

import {
  FeedProvider,
} from '@/components/masonry/FeedProvider'

import {
  Shell,
} from '@/components/shell/Shell'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AnalyticsProvider
      domain={
        process.env
          .NEXT_PUBLIC_PLAUSIBLE_DOMAIN
      }
    >
      <FeedProvider>
        <Shell>
          {children}
        </Shell>
      </FeedProvider>
    </AnalyticsProvider>
  )
}