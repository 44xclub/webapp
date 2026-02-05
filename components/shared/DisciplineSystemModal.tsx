'use client'

import { Modal } from '@/components/ui'
import { CheckCircle2, XCircle, Clock, Trophy, Star, AlertTriangle, Zap } from 'lucide-react'

interface DisciplineSystemModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DisciplineSystemModal({ isOpen, onClose }: DisciplineSystemModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Discipline System">
      <div className="px-2 pb-2 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Section A - What this score is */}
        <section>
          <h3 className="text-[13px] font-semibold text-[#eef2ff] mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#3b82f6]" />
            What is Discipline Score?
          </h3>
          <p className="text-[12px] text-[rgba(238,242,255,0.72)] leading-relaxed">
            Not a fitness score. It measures your <span className="text-[#eef2ff] font-medium">planning + execution</span> consistency.
          </p>
        </section>

        {/* Section B - When it updates */}
        <section>
          <h3 className="text-[13px] font-semibold text-[#eef2ff] mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#3b82f6]" />
            When Does It Update?
          </h3>
          <ul className="space-y-1.5 text-[12px] text-[rgba(238,242,255,0.72)]">
            <li className="flex items-start gap-2">
              <span className="text-[rgba(238,242,255,0.45)]">-</span>
              <span>Resolved daily at <span className="text-[#eef2ff] font-medium">12:00 (midday)</span> for the previous day</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[rgba(238,242,255,0.45)]">-</span>
              <span>After cutoff, scoring <span className="text-[#eef2ff] font-medium">locks permanently</span></span>
            </li>
          </ul>
        </section>

        {/* Section C - How you earn/lose points */}
        <section>
          <h3 className="text-[13px] font-semibold text-[#eef2ff] mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#3b82f6]" />
            How Points Work
          </h3>

          {/* Earn */}
          <div className="mb-3">
            <p className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold mb-2">Earn</p>
            <ul className="space-y-1.5 text-[12px]">
              <li className="flex items-center justify-between">
                <span className="text-[rgba(238,242,255,0.72)]">Workout completed</span>
                <span className="text-emerald-400 font-medium">+1</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[rgba(238,242,255,0.72)]">Habit completed</span>
                <span className="text-emerald-400 font-medium">+1</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[rgba(238,242,255,0.72)]">Meal logged</span>
                <span className="text-emerald-400 font-medium">+1</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[rgba(238,242,255,0.72)]">Challenge (same-day)</span>
                <span className="text-emerald-400 font-medium">+3</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[rgba(238,242,255,0.72)]">Framework: Complete</span>
                <span className="text-emerald-400 font-medium">+3</span>
              </li>
            </ul>
          </div>

          {/* Bonuses */}
          <div className="mb-3">
            <p className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold mb-2">Bonuses</p>
            <ul className="space-y-1.5 text-[12px]">
              <li className="flex items-center justify-between">
                <span className="text-[rgba(238,242,255,0.72)]">Full day bonus (2+ planned, 100% done)</span>
                <span className="text-amber-400 font-medium">+5</span>
              </li>
            </ul>
          </div>

          {/* Penalties */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-rose-400 font-semibold mb-2">Penalties</p>
            <ul className="space-y-1.5 text-[12px]">
              <li className="flex items-center justify-between">
                <span className="text-[rgba(238,242,255,0.72)]">Missed planned block (each)</span>
                <span className="text-rose-400 font-medium">-1</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[rgba(238,242,255,0.72)]">Missed planned blocks cap</span>
                <span className="text-rose-400 font-medium">max -5</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[rgba(238,242,255,0.72)]">No planned blocks</span>
                <span className="text-rose-400 font-medium">-3</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[rgba(238,242,255,0.72)]">Framework: Zero</span>
                <span className="text-rose-400 font-medium">-2</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section D - Levels */}
        <section>
          <h3 className="text-[13px] font-semibold text-[#eef2ff] mb-2 flex items-center gap-2">
            <Star className="h-4 w-4 text-[#3b82f6]" />
            Levels & Badges
          </h3>
          <p className="text-[12px] text-[rgba(238,242,255,0.72)] mb-3">
            Level is derived from score (0-44). Badge tiers:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2 p-2 rounded-[8px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <span className="text-[rgba(238,242,255,0.60)]">0-3</span>
              <span className="text-[rgba(238,242,255,0.72)] font-medium">Initiated</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-[8px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <span className="text-[#60a5fa]">4-13</span>
              <span className="text-[#60a5fa] font-medium">Committed</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-[8px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <span className="text-[#22d3ee]">14-23</span>
              <span className="text-[#22d3ee] font-medium">Elite</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-[8px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <span className="text-[#f59e0b]">24-33</span>
              <span className="text-[#f59e0b] font-medium">Forged</span>
            </div>
            <div className="col-span-2 flex items-center justify-center gap-2 p-2 rounded-[8px] bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.2)]">
              <span className="text-[#a78bfa]">34-44</span>
              <span className="text-[#a78bfa] font-medium">44-Pro</span>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  )
}
