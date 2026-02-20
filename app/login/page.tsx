'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Supabase returns a user with empty identities when the email already exists
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('An account with this email already exists. Please sign in instead.')
        setLoading(false)
        return
      }

      // Sign in immediately after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      router.replace('/app')
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      router.replace('/app')
    }
  }

  return (
    <div className="min-h-app flex items-center justify-center px-6 bg-[#07090d]">
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
          {isSignUp ? 'Create your account to get started.' : 'Sign in to your account.'}
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-[10px] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] px-4 py-3">
            <p className="text-[13px] text-[#ef4444]">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-[48px] rounded-[14px] bg-[rgba(238,242,255,0.06)] border border-[rgba(238,242,255,0.1)] px-4 text-[15px] text-[#eef2ff] placeholder-[rgba(238,242,255,0.3)] outline-none focus:border-[rgba(238,242,255,0.25)] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-[48px] rounded-[14px] bg-[rgba(238,242,255,0.06)] border border-[rgba(238,242,255,0.1)] px-4 text-[15px] text-[#eef2ff] placeholder-[rgba(238,242,255,0.3)] outline-none focus:border-[rgba(238,242,255,0.25)] transition-colors"
          />

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 w-full h-[48px] rounded-[14px] bg-[#eef2ff] text-[#07090d] text-[15px] font-semibold transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSignUp ? (
              'Sign Up'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <button
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError(null)
          }}
          className="inline-block mt-4 text-[13px] font-medium text-[rgba(238,242,255,0.40)] hover:text-[rgba(238,242,255,0.60)] transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  )
}
