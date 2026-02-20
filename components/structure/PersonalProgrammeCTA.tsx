'use client'

import Link from 'next/link'
import { Dumbbell, ChevronRight } from 'lucide-react'

export function PersonalProgrammeCTA() {
  return (
    <Link
      href="/programmes"
      className="block no-underline"
    >
      <div className="relative overflow-hidden rounded-[12px] h-[64px] border border-[rgba(255,255,255,0.08)] bg-gradient-to-r from-[rgba(147,51,234,0.12)] to-[rgba(147,51,234,0.04)] hover:border-[rgba(255,255,255,0.14)] active:border-[rgba(255,255,255,0.18)] transition-colors group">
        <div className="absolute inset-0 p-3 flex items-center gap-3">
          <div className="p-2 rounded-[10px] bg-[rgba(147,51,234,0.15)] border border-[rgba(147,51,234,0.20)] flex-shrink-0">
            <Dumbbell className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#eef2ff] leading-tight">
              Personal Programme
            </p>
            <p className="text-[11px] text-[rgba(238,242,255,0.45)] leading-tight mt-0.5">
              Build your own
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-[rgba(238,242,255,0.30)] flex-shrink-0 group-hover:text-[rgba(238,242,255,0.50)] transition-colors" />
        </div>
      </div>
    </Link>
  )
}
