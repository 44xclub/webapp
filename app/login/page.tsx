import Image from 'next/image'
import Link from 'next/link'
import { LoginButton } from './LoginButton'

/**
 * /login — Sign in with Whop.
 *
 * Shown to standalone visitors (not in Whop iframe).
 * The only way to authenticate is via Whop OAuth,
 * which verifies paid membership before granting access.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center px-6 bg-[#07090d]">
      <div className="w-full max-w-sm text-center animate-fadeIn">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="44 Club"
            width={160}
            height={160}
            priority
            className="object-contain opacity-80"
          />
        </div>

        {/* Title */}
        <h1 className="text-[20px] font-bold text-[#eef2ff] mb-2">
          Welcome to 44CLUB
        </h1>

        {/* Subtitle */}
        <p className="text-[14px] text-[rgba(238,242,255,0.52)] leading-relaxed mb-8">
          Sign in with your Whop account to access the app.
          Active membership required.
        </p>

        {/* Sign in button */}
        <LoginButton />

        {/* Secondary link */}
        <Link
          href={process.env.NEXT_PUBLIC_WHOP_PRODUCT_URL || 'https://whop.com/44club/'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-[13px] font-medium text-[rgba(238,242,255,0.40)] hover:text-[rgba(238,242,255,0.60)] transition-colors"
        >
          Need access? Join 44CLUB &rarr;
        </Link>
      </div>
    </div>
  )
}
