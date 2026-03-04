export default function PersonalFrameworkLoading() {
  return (
    <div className="min-h-app content-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
      <div className="px-4 pt-16 space-y-4">
        <div className="h-6 w-48 bg-[rgba(255,255,255,0.045)] rounded-[8px] animate-pulse" />
        <div className="h-4 w-64 bg-[rgba(255,255,255,0.045)] rounded-[6px] animate-pulse" />
        <div className="h-32 bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] animate-pulse" />
      </div>
    </div>
  )
}
