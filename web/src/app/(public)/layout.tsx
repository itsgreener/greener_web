import { Shell } from '@/components/shell/Shell'
import { FeedProvider } from '@/components/masonry/FeedProvider'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FeedProvider>
      <Shell>{children}</Shell>
    </FeedProvider>
  )
}
