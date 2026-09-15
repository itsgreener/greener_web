import { Shell } from '@/components/shell/Shell'
import { HomeFeedProvider } from '@/components/masonry/HomeFeed/HomeFeedProvider'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <HomeFeedProvider>
      <Shell>{children}</Shell>
    </HomeFeedProvider>
  )
}
