'use client'

import Image from 'next/image'
import { ShieldX, ExternalLink } from 'lucide-react'

/**
 * Access Wall — shown when a user doesn't have an active 44CLUB membership.
 *
 * Reached via:
 *  - WhopGate (iframe) when bootstrap returns 403
 *  - OAuth callback when membership check fails
 */

const WHOP_PRODUCT_URL = process.env.NEXT_PUBLIC_WHOP_PRODUCT_URL || 'https://whop.com/44club/'

export function AccessWall() {
  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center px-6 bg-[#07090d]">
      <div className="w-full max-w-sm text-center animate-fadeIn">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="44 Club"
            width={160}
            height={160}
            priority
            className="object-contain opacity-80"
          />
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
            <ShieldX className="h-6 w-6 text-[#ef4444]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[20px] font-bold text-[#eef2ff] mb-2">
          Access restricted
        </h1>

        {/* Body */}
        <p className="text-[14px] text-[rgba(238,242,255,0.52)] leading-relaxed mb-8">
          An active <span className="text-[#eef2ff] font-medium">44CLUB</span> membership on Whop is required to use this app.
        </p>

        {/* CTA — Get access on Whop */}
        <a
          href={WHOP_PRODUCT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full h-[48px] rounded-[14px] bg-[#eef2ff] text-[#07090d] text-[15px] font-semibold transition-opacity hover:opacity-90 active:opacity-80"
        >
          Get access on Whop
          <ExternalLink className="h-4 w-4" />
        </a>

        {/* Secondary link */}
        <a
          href={WHOP_PRODUCT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-[13px] font-medium text-[rgba(238,242,255,0.40)] hover:text-[rgba(238,242,255,0.60)] transition-colors"
        >
          Need access? Join 44CLUB &rarr;
        </a>
      </div>
    </div>
  )
}
