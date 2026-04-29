import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

import { ArrowRight, Kanban } from '@phosphor-icons/react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const slowTimer = useRef(null)
  const signUp = useAuthStore((s) => s.signUp)
  const navigate = useNavigate()

  // Clean up timer on unmount
  useEffect(() => () => clearTimeout(slowTimer.current), [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setSlow(false)
    // Show "still working" after 3s so user knows it's not stuck
    slowTimer.current = setTimeout(() => setSlow(true), 3000)
    try {
      await signUp(email, password, displayName || email.split('@')[0])
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      clearTimeout(slowTimer.current)
      setLoading(false)
      setSlow(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Kanban size={30} weight="fill" className="text-[var(--color-logo)]" />
          <span className="text-[23px] font-[450] text-[var(--text-primary)] tracking-tight leading-none font-logo">
            Kolumn
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-normal text-[var(--text-primary)] font-heading mb-2 leading-tight">
            Create your account
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Start organizing your work in under a minute.
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm space-y-4"
        >
          {error && (
            <div className="text-sm text-[var(--color-copper)] bg-[var(--color-copper-wash)]/60 border border-[var(--color-copper)]/30 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
              Display name
            </label>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 6 characters"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            loading={loading}
            loadingText={slow ? 'Setting up your workspace' : 'Creating account'}
            className="group w-full"
          >
            Create account
            {!loading && (
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[var(--color-logo)] font-medium hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
