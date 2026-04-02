import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { UserPlus } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signUp = useAuthStore((s) => s.signUp)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await signUp(email, password, displayName || email.split('@')[0])
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F2EDE8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span
            className="material-symbols-outlined text-black mx-auto mb-3 block"
            style={{ fontSize: '40px', lineHeight: '40px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          >owl</span>
          <h1 className="text-2xl font-bold text-[#1B1B18] font-logo">Kolumn</h1>
          <p className="text-sm text-[#5C5C57] mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#E0DBD5] rounded-2xl p-6 shadow-sm space-y-4">
          {error && (
            <div className="text-sm text-[#7A5C44] bg-[#F0E0D2] rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[#5C5C57] mb-1 block">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              className="w-full text-sm rounded-xl px-3 py-2.5 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6]"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#5C5C57] mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-sm rounded-xl px-3 py-2.5 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#5C5C57] mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-sm rounded-xl px-3 py-2.5 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6]"
              placeholder="Min 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B1B18] text-white text-sm font-medium rounded-xl hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="text-center text-sm text-[#5C5C57] mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-[#A8BA32] hover:text-[#A8BA32] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
