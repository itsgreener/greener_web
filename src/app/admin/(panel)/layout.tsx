import { AdminShell } from '@/components/admin/AdminShell'

type Props = {
  children: React.ReactNode
}

export default function AdminPanelLayout({ children }: Props) {
  return <AdminShell>{children}</AdminShell>
}
