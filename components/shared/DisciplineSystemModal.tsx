'use client'

import { Modal } from '@/components/ui'

interface DisciplineSystemModalProps {
  isOpen: boolean
  onClose: () => void
}

// iOS-style table row component
function TableRow({
  label,
  value,
  valueColor = 'text-[rgba(238,242,255,0.72)]',
  isLast = false
}: {
  label: string
  value: string
  valueColor?: string
  isLast?: boolean
}) {
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 ${!isLast ? 'border-b border-[rgba(255,255,255,0.06)]' : ''}`}>
      <span className="text-[13px] text-[rgba(238,242,255,0.85)]">{label}</span>
      <span className={`text-[13px] font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}

// iOS-style table section
function TableSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[rgba(238,242,255,0.45)] font-semibold mb-1.5 px-1">
        {title}
      </p>
      <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function DisciplineSystemModal({ isOpen, onClose }: DisciplineSystemModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Discipline System">
      <div className="px-3 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Summary */}
        <p className="text-[12px] text-[rgba(238,242,255,0.60)] text-center px-2">
          Measures planning + execution consistency. Updates daily at 12:00.
        </p>

        {/* Earn Points */}
        <TableSection title="Earn Points">
          <TableRow label="Workout" value="+1" valueColor="text-emerald-400" />
          <TableRow label="Habit" value="+1" valueColor="text-emerald-400" />
          <TableRow label="Meal" value="+1" valueColor="text-emerald-400" />
          <TableRow label="Challenge" value="+3" valueColor="text-emerald-400" />
          <TableRow label="Framework Complete" value="+3" valueColor="text-emerald-400" />
          <TableRow label="Full Day (2+ planned, 100%)" value="+5" valueColor="text-amber-400" isLast />
        </TableSection>

        {/* Penalties */}
        <TableSection title="Penalties">
          <TableRow label="Missed block (each)" value="-1" valueColor="text-rose-400" />
          <TableRow label="Missed blocks cap" value="-5 max" valueColor="text-rose-400" />
          <TableRow label="No planned blocks" value="-3" valueColor="text-rose-400" />
          <TableRow label="Framework Zero" value="-2" valueColor="text-rose-400" isLast />
        </TableSection>

        {/* Levels */}
        <TableSection title="Levels (Score Range)">
          <TableRow label="Initiated" value="0-3" valueColor="text-[rgba(238,242,255,0.60)]" />
          <TableRow label="Committed" value="4-13" valueColor="text-[#60a5fa]" />
          <TableRow label="Elite" value="14-23" valueColor="text-[#22d3ee]" />
          <TableRow label="Forged" value="24-33" valueColor="text-[#f59e0b]" />
          <TableRow label="44-Pro" value="34-44" valueColor="text-[#a78bfa]" isLast />
        </TableSection>
      </div>
    </Modal>
  )
}
