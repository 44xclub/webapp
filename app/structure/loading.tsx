import { AppShell } from '@/components/shared/AppShell'

export default function EventsLoading() {
  return (
    <AppShell>
      <div className="animate-pulse px-4 pt-16 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="section-card p-0 overflow-hidden">
            <div className="h-[120px] bg-gradient-to-br from-[rgba(255,255,255,0.04)] to-[rgba(255,255,255,0.02)]" />
            <div className="px-3.5 py-3 space-y-2">
              <div className="h-4 w-3/4 bg-[rgba(255,255,255,0.06)] rounded" />
              <div className="h-3 w-1/2 bg-[rgba(255,255,255,0.04)] rounded" />
              <div className="h-9 w-full bg-[rgba(255,255,255,0.04)] rounded-[10px] mt-3" />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
