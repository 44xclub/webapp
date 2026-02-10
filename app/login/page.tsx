'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Modal } from '@/components/ui'
import { Loader2, CheckCircle, Mail } from 'lucide-react'
import Image from 'next/image'

/*
  44CLUB Login Page
  Entry point. Elite access.
*/

function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'auth_callback_error') {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const supabase = createClient()

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError('An account with this email already exists.')
        } else if (data.user && !data.session) {
          setMessage('Check your email for a confirmation link to complete signup.')
        } else if (data.session) {
          router.push('/app')
          router.refresh()
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/app')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setResetLoading(false)
    }
  }

  const closeForgotPassword = () => {
    setForgotPasswordOpen(false)
    setResetEmail('')
    setResetSent(false)
    setResetError('')
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center px-4 bg-[#07090d]">
      <div className="w-full max-w-sm animate-fadeIn">
        {/* Logo - 1.25x larger (225px), no BLOCKS text */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="44 Club"
              width={225}
              height={225}
              priority
              className="object-contain"
            />
          </div>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-4 p-4 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-[14px] flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#22c55e]">{message}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <div>
            <Input
              type="password"
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="mt-1.5 text-[12px] font-medium text-[rgba(238,242,255,0.45)] hover:text-[#3b82f6] transition-colors duration-[140ms]"
              >
                Forgot password?
              </button>
            )}
          </div>

          {error && <p className="text-[13px] text-[#ef4444]">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Toggle mode */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
            className="text-[13px] font-medium text-[rgba(238,242,255,0.52)] hover:text-[rgba(238,242,255,0.72)] transition-colors duration-[140ms]"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotPasswordOpen}
        onClose={closeForgotPassword}
        title="Reset Password"
        showClose={true}
      >
        <div className="p-4">
          {resetSent ? (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center mx-auto mb-3">
                <Mail className="h-6 w-6 text-[#22c55e]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#eef2ff] mb-2">Check your email</h3>
              <p className="text-[13px] text-[rgba(238,242,255,0.60)] mb-4">
                We&apos;ve sent a password reset link to <span className="font-medium text-[#eef2ff]">{resetEmail}</span>
              </p>
              <Button onClick={closeForgotPassword} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-[13px] text-[rgba(238,242,255,0.60)]">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {resetError && <p className="text-[12px] text-[#ef4444]">{resetError}</p>}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={closeForgotPassword} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" loading={resetLoading} className="flex-1">
                  Send Reset Link
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
          <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
