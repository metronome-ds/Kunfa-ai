import { createClient } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isSuperAdmin } from '@/lib/super-admins'
import { AdminShell } from './AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isSuperAdmin(user.email)) redirect('/dashboard')

  return <AdminShell>{children}</AdminShell>
}
