import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import PlanCard from '../components/PlanCard'
import { PLANS } from '../data/plans'

import { Kanban } from '@phosphor-icons/react'

export default function SignupPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialEmail = location.state?.email || ''

  const [step, setStep] = useState('details') // 'details' | 'plan'

  // ── account-details step ──────────────────────────────────────────
  const [email, setEmail] = useState(initialEmail)
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const slowTimer = useRef(null)
  const signUp = useAuthStore((s) => s.signUp)
  const setTier = useAuthStore((s) => s.setTier)

  // ── plan-picker step ──────────────────────────────────────────────
  // No "chosen" state: each card's CTA is its own commit point. We
  // only track which card is mid-request so the others can disable.
  const [committingPlan, setCommittingPlan] = useState(null)

  useEffect(() => () => clearTimeout(slowTimer.current), [])

  const handleSubmitDetails = async (e) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Enter your email to continue'); return }
    if (!agreed) { setError('Please accept the terms to continue'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    setSlow(false)
    slowTimer.current = setTimeout(() => setSlow(true), 3000)
    try {
      await signUp(email, password, displayName || email.split('@')[0])
      setStep('plan')
    } catch (err) {
      setError(err.message)
    } finally {
      clearTimeout(slowTimer.current)
      setLoading(false)
      setSlow(false)
    }
  }

  const handlePickPlan = async (planId) => {
    setError('')
    // Pro routes through the dedicated upgrade page (period picker,
    // order summary, payment flow). We DON'T write tier here — the
    // upgrade page commits the tier once the user confirms billing.
    if (planId === 'pro') {
      navigate('/upgrade/pro')
      return
    }
    setCommittingPlan(planId)
    try {
      // Free is the column's default — skip the write to keep the
      // happy path one round-trip lighter.
      if (planId !== 'free') {
        await setTier(planId)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
      setCommittingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex flex-col">
      {/* Brand at top */}
      <div className="flex justify-center pt-10" aria-hidden="true">
        <div className="flex items-center">
          <Kanban size={28} weight="fill" className="text-[var(--color-logo)]" />
          <span className="text-[22px] font-[450] text-[var(--text-primary)] tracking-tight leading-none ml-1.5 font-logo">
            Kolumn
          </span>
        </div>
      </div>

      {step === 'details' ? (
        <DetailsStep
          email={email}
          setEmail={setEmail}
          initialEmail={initialEmail}
          displayName={displayName}
          setDisplayName={setDisplayName}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          agreed={agreed}
          setAgreed={setAgreed}
          error={error}
          loading={loading}
          slow={slow}
          onSubmit={handleSubmitDetails}
        />
      ) : (
        <PlanStep
          plans={PLANS}
          committingPlan={committingPlan}
          error={error}
          onPick={handlePickPlan}
        />
      )}
    </div>
  )
}

function DetailsStep({
  email, setEmail, initialEmail,
  displayName, setDisplayName,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  agreed, setAgreed,
  error, loading, slow,
  onSubmit,
}) {
  return (
    <>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-[30px] px-4 py-10">
        <div className="flex w-full max-w-[450px] flex-col items-center gap-5">
          <header className="w-full max-w-md text-center mb-1">
            <h1 className="text-[28px] font-normal text-[var(--text-primary)] font-heading mb-1 leading-tight">
              Let's create your account
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">A few things for you to review</p>
          </header>

          <form onSubmit={onSubmit} className="mx-auto w-full">
            <div className="mx-auto grid gap-3">
              {error && (
                <div className="text-sm text-[var(--color-copper)] bg-[var(--color-copper-wash)]/60 border border-[var(--color-copper)]/30 rounded-xl px-3 py-2.5">
                  {error}
                </div>
              )}

              <div className="rounded-2xl border border-[var(--color-sand)] p-5 space-y-4">
                {!initialEmail && (
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="!h-11 !rounded-[0.6rem] !text-base"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Your name</label>
                  <Input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How should we greet you?"
                    autoFocus={!!initialEmail}
                    className="!h-11 !rounded-[0.6rem] !text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="!h-11 !rounded-[0.6rem] !text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Confirm password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Type your password again"
                    required
                    aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
                    className="!h-11 !rounded-[0.6rem] !text-base"
                  />
                  {confirmPassword.length > 0 && confirmPassword !== password && (
                    <p className="text-xs text-[var(--color-copper)] mt-1.5">Passwords don't match yet.</p>
                  )}
                </div>

                <label className="flex flex-row gap-3 cursor-pointer text-left items-start select-none pt-1">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center border rounded transition-colors duration-100 border-[var(--border-default)] peer-checked:border-[var(--text-primary)] peer-checked:bg-[var(--text-primary)] peer-focus-visible:ring-1 ring-offset-2 ring-offset-[var(--surface-page)] ring-[var(--text-primary)]/30">
                    {agreed && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-[var(--text-secondary)] leading-snug">
                    I agree to Kolumn's{' '}
                    <a href="/terms" target="_blank" rel="noopener" className="underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-primary)]">Terms of Service</a>{' '}
                    and{' '}
                    <a href="/privacy" target="_blank" rel="noopener" className="underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-primary)]">Privacy Policy</a>.
                  </span>
                </label>

                <Button
                  type="submit"
                  size="lg"
                  loading={loading}
                  loadingText={slow ? 'Setting up your workspace…' : 'Creating account…'}
                  className="w-full !text-base !rounded-[0.6rem]"
                >
                  Create account
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col justify-end px-4 pb-10">
        <div className="text-center text-sm text-[var(--text-muted)]">
          {initialEmail ? (
            <>
              <div>
                Continuing as <span className="font-medium text-[var(--text-secondary)]">{initialEmail}</span>
              </div>
              <Link to="/" className="inline underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-secondary)]">
                Use a different email
              </Link>
            </>
          ) : (
            <div>
              Already have an account?{' '}
              <Link to="/" className="inline underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-secondary)]">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function PlanStep({ plans, committingPlan, error, onPick }) {
  const isCommitting = committingPlan !== null
  return (
    <div className="flex w-full flex-1 flex-col items-center gap-10 px-4 py-12 max-w-[90rem] mx-auto">
      <header className="w-full max-w-md text-center mb-1">
        <h1 className="text-[28px] font-normal text-[var(--text-primary)] font-heading mb-1 leading-tight">
          Choose your plan
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          You can change this anytime in settings.
        </p>
      </header>

      {error && (
        <div className="text-sm text-[var(--color-copper)] bg-[var(--color-copper-wash)]/60 border border-[var(--color-copper)]/30 rounded-xl px-3 py-2.5 max-w-md w-full">
          {error}
        </div>
      )}

      <div className="grid w-full grid-cols-1 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            mode="picker"
            onSelect={onPick}
            loading={committingPlan === plan.id}
            disabled={isCommitting && committingPlan !== plan.id}
          />
        ))}
      </div>
    </div>
  )
}
