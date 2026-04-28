import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

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
            <div className="text-sm text-[var(--color-bark)] bg-[var(--color-bark-wash)]/60 border border-[#D4A07A]/40 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
              className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)]"
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-sm font-medium rounded-xl hover:bg-[var(--btn-primary-hover)] transition-all duration-75 active:scale-[0.995] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Signing in…' : 'Sign in'}
            {!loading && (
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
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
