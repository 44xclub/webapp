'use client'

import { Modal } from '@/components/ui'
import { Shield, Target, Flame, Swords, Award, Anvil, Rocket, Crown, Info, TrendingUp, AlertTriangle, Calculator } from 'lucide-react'
import type { DisciplineBadge } from '@/lib/types'
import { BADGE_THRESHOLDS, SCORING } from '@/lib/types'

interface DisciplineSystemModalProps {
  isOpen: boolean
  onClose: () => void
  // Optional: pass today's breakdown for dynamic display
  todayBreakdown?: {
    plannedBlocks: number
    completedBlocks: number
    executionRate: number
    basePoints: number
    penalties: number
    multiplier: number
    delta: number
    reason?: string
  }
}

// Badge icons for display
const badgeIcons: Record<DisciplineBadge, typeof Shield> = {
  'Initiated': Shield,
  'Aligned': Target,
  'Committed': Flame,
  'Disciplined': Swords,
  'Elite': Award,
  'Forged': Anvil,
  'Vanguard': Rocket,
  '44 Pro': Crown,
}

// Badge colors
const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-slate-400',
  'Aligned': 'text-emerald-400',
  'Committed': 'text-blue-400',
  'Disciplined': 'text-indigo-400',
  'Elite': 'text-cyan-400',
  'Forged': 'text-amber-400',
  'Vanguard': 'text-rose-400',
  '44 Pro': 'text-purple-400',
}

// iOS-style table row component
function TableRow({
  label,
  value,
  valueColor = 'text-[rgba(238,242,255,0.72)]',
  isLast = false,
  icon?: React.ReactNode,
}: {
  label: string
  value: string
  valueColor?: string
  isLast?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 ${!isLast ? 'border-b border-[rgba(255,255,255,0.06)]' : ''}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[13px] text-[rgba(238,242,255,0.85)]">{label}</span>
      </div>
      <span className={`text-[13px] font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}

// iOS-style table section
function TableSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        {icon}
        <p className="text-[11px] uppercase tracking-wider text-[rgba(238,242,255,0.45)] font-semibold">
          {title}
        </p>
      </div>
      <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function DisciplineSystemModal({ isOpen, onClose, todayBreakdown }: DisciplineSystemModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Discipline System">
      <div className="px-3 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Summary */}
        <div className="bg-[rgba(59,130,246,0.08)] rounded-[10px] border border-[rgba(59,130,246,0.2)] p-3">
          <p className="text-[12px] text-[rgba(238,242,255,0.75)] leading-relaxed">
            <strong className="text-[#3b82f6]">Lifetime Discipline Score</strong> measures consistent execution over time.
            Progress is <strong>permanent</strong>. Badge wear eligibility is <strong>conditional</strong> on recent behavior.
            Score updates daily at 12:00.
          </p>
        </div>

        {/* Base Points - Completed Only */}
        <TableSection title="Base Points (Completed Blocks)" icon={<TrendingUp className="h-3 w-3 text-emerald-400" />}>
          <TableRow label="Workout completed" value={`+${SCORING.WORKOUT}`} valueColor="text-emerald-400" />
          <TableRow label="Habit completed" value={`+${SCORING.HABIT}`} valueColor="text-emerald-400" />
          <TableRow label="Meal (nutrition) completed" value={`+${SCORING.NUTRITION}`} valueColor="text-emerald-400" />
          <TableRow label="Challenge completed" value={`+${SCORING.CHALLENGE}`} valueColor="text-emerald-400" />
          <TableRow label="Framework criteria (each)" value={`+${SCORING.FRAMEWORK_ITEM}`} valueColor="text-emerald-400" isLast />
        </TableSection>

        {/* Penalties */}
        <TableSection title="Penalties (Daily Only)" icon={<AlertTriangle className="h-3 w-3 text-rose-400" />}>
          <TableRow label="Missed planned block (each)" value={`${SCORING.MISSED_BLOCK}`} valueColor="text-rose-400" />
          <TableRow label="Missed block cap" value={`${SCORING.MISSED_BLOCK_CAP} max`} valueColor="text-rose-400" />
          <TableRow label="Planned but 0 completed" value={`${SCORING.PLANNED_ZERO_COMPLETED}`} valueColor="text-rose-400" />
          <TableRow label="Framework active, zero progress" value={`${SCORING.FRAMEWORK_ZERO_PROGRESS}`} valueColor="text-rose-400" />
          <TableRow label="No planned blocks" value="Day voided" valueColor="text-rose-400" isLast />
        </TableSection>

        {/* Execution Multiplier */}
        <TableSection title="Execution Multiplier" icon={<Calculator className="h-3 w-3 text-blue-400" />}>
          <TableRow label="100% execution" value={`×${SCORING.MULTIPLIER_100}`} valueColor="text-emerald-400" />
          <TableRow label="80-99% execution" value={`×${SCORING.MULTIPLIER_80_99}`} valueColor="text-blue-400" />
          <TableRow label="60-79% execution" value={`×${SCORING.MULTIPLIER_60_79}`} valueColor="text-[rgba(238,242,255,0.72)]" />
          <TableRow label="40-59% execution" value={`×${SCORING.MULTIPLIER_40_59}`} valueColor="text-amber-400" />
          <TableRow label="Below 40% execution" value="×0 (voided)" valueColor="text-rose-400" isLast />
        </TableSection>

        {/* Gating Rules */}
        <TableSection title="Gating Rules" icon={<Info className="h-3 w-3 text-amber-400" />}>
          <div className="px-3 py-2.5 text-[12px] text-[rgba(238,242,255,0.65)] leading-relaxed">
            <p className="mb-2">Points are only earned if:</p>
            <ul className="list-disc list-inside space-y-1 text-[rgba(238,242,255,0.55)]">
              <li>At least one block was planned</li>
              <li>Execution rate ≥ 60%</li>
            </ul>
            <p className="mt-2 text-[11px] text-[rgba(238,242,255,0.45)]">
              If either fails, delta = 0 for the day. Lifetime Score never decreases.
            </p>
          </div>
        </TableSection>

        {/* Badge Thresholds */}
        <TableSection title="Badge Ladder (Lifetime Score)">
          {BADGE_THRESHOLDS.map((threshold, index) => {
            const Icon = badgeIcons[threshold.badge]
            const color = badgeColors[threshold.badge]
            const range = threshold.max === Infinity
              ? `${threshold.min.toLocaleString()}+`
              : `${threshold.min.toLocaleString()}–${threshold.max.toLocaleString()}`
            return (
              <TableRow
                key={threshold.badge}
                label={threshold.badge}
                value={range}
                valueColor={color}
                isLast={index === BADGE_THRESHOLDS.length - 1}
                icon={<Icon className={`h-3.5 w-3.5 ${color}`} />}
              />
            )
          })}
        </TableSection>

        {/* Badge Eligibility Rules */}
        <TableSection title="Badge Wear Eligibility">
          <div className="px-3 py-2.5 text-[12px] text-[rgba(238,242,255,0.65)] leading-relaxed">
            <p className="mb-2">A badge can be worn if all conditions are met:</p>
            <ul className="list-disc list-inside space-y-1 text-[rgba(238,242,255,0.55)]">
              <li>≥ 4 executed days in last 7 (execution ≥ 60%)</li>
              <li>Average execution ≥ 70% over last 7 days</li>
              <li>No days with zero planned blocks in last 5 days</li>
            </ul>
            <p className="mt-2 text-[11px] text-rose-400">
              If any rule fails, badge is locked. Lifetime Score continues increasing.
            </p>
          </div>
        </TableSection>

        {/* Today's Breakdown (if provided) */}
        {todayBreakdown && (
          <TableSection title="Today's Breakdown">
            <TableRow label="Planned blocks" value={String(todayBreakdown.plannedBlocks)} />
            <TableRow label="Completed blocks" value={String(todayBreakdown.completedBlocks)} />
            <TableRow
              label="Execution rate"
              value={`${Math.round(todayBreakdown.executionRate * 100)}%`}
              valueColor={todayBreakdown.executionRate >= 0.8 ? 'text-emerald-400' : todayBreakdown.executionRate >= 0.6 ? 'text-blue-400' : 'text-rose-400'}
            />
            <TableRow label="Base points" value={`+${todayBreakdown.basePoints}`} valueColor="text-emerald-400" />
            <TableRow label="Penalties" value={String(todayBreakdown.penalties)} valueColor="text-rose-400" />
            <TableRow label="Multiplier" value={`×${todayBreakdown.multiplier}`} valueColor="text-blue-400" />
            <TableRow
              label="Points earned today"
              value={`+${todayBreakdown.delta}`}
              valueColor={todayBreakdown.delta > 0 ? 'text-emerald-400' : 'text-[rgba(238,242,255,0.45)]'}
              isLast={!todayBreakdown.reason}
            />
            {todayBreakdown.reason && (
              <div className="px-3 py-2 bg-rose-500/10 text-[11px] text-rose-400">
                {todayBreakdown.reason}
              </div>
            )}
          </TableSection>
        )}

        {/* Footer */}
        <p className="text-[10px] text-[rgba(238,242,255,0.35)] text-center pt-2">
          Progress is permanent. Status is conditional. Discipline cannot be gamed.
        </p>
      </div>
    </Modal>
  )
}
