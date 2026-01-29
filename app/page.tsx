import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering - this page depends on auth state
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/app')
  } else {
    redirect('/login')
  }
}
