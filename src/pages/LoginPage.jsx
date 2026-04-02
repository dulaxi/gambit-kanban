import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogIn } from 'lucide-react'

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
          <p className="text-sm text-[#5C5C57] mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#E0DBD5] rounded-2xl p-6 shadow-sm space-y-4">
          {error && (
            <div className="text-sm text-[#7A5C44] bg-[#F0E0D2] rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[#5C5C57] mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
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
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B1B18] text-white text-sm font-medium rounded-xl hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="text-center">
            <Link to="/forgot-password" className="text-xs text-[#8E8E89] hover:text-[#A8BA32] transition-colors">
              Forgot your password?
            </Link>
          </div>
        </form>

        <p className="text-center text-sm text-[#5C5C57] mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#A8BA32] hover:text-[#A8BA32] font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
