'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: 'You cancelled the sign-in. Try again when ready.',
  invalid_state: 'Session expired. Please try again.',
  token_exchange: 'Could not complete sign-in. Please try again.',
  verification: 'Could not verify your Whop account.',
  provision: 'Account setup failed. Please try again.',
}

function LoginButtonInner() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <>
      {error && (
        <div className="mb-4 rounded-[10px] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] px-4 py-3">
          <p className="text-[13px] text-[#ef4444]">
            {ERROR_MESSAGES[error] || 'Something went wrong. Please try again.'}
          </p>
        </div>
      )}

      <a
        href="/api/auth/whop/authorize"
        className="inline-flex items-center justify-center gap-2 w-full h-[48px] rounded-[14px] bg-[#eef2ff] text-[#07090d] text-[15px] font-semibold transition-opacity hover:opacity-90 active:opacity-80"
      >
        Sign in with Whop
      </a>
    </>
  )
}

export function LoginButton() {
  return (
    <Suspense
      fallback={
        <a
          href="/api/auth/whop/authorize"
          className="inline-flex items-center justify-center gap-2 w-full h-[48px] rounded-[14px] bg-[#eef2ff] text-[#07090d] text-[15px] font-semibold transition-opacity hover:opacity-90 active:opacity-80"
        >
          Sign in with Whop
        </a>
      }
    >
      <LoginButtonInner />
    </Suspense>
  )
}
