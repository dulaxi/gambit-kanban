import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

import { ArrowRight, Kanban } from '@phosphor-icons/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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
            Welcome back
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Sign in to continue to your workspace.
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
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--color-logo)] transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            loading={loading}
            loadingText="Signing in"
            className="group w-full"
          >
            Sign in
            {!loading && (
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-[var(--color-logo)] font-medium hover:underline underline-offset-4"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
