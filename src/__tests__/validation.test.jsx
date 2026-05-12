import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockSetTier = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    signIn: mockSignIn,
    signUp: mockSignUp,
    setTier: mockSetTier,
  })),
}))
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={typeof to === 'string' ? to : '#'}>{children}</a>,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null, pathname: '/signup' }),
}))

import SignupPage from '../pages/SignupPage'

beforeEach(() => {
  mockSignIn.mockReset()
  mockSignUp.mockReset()
  mockSetTier.mockReset()
  mockNavigate.mockReset()
})

describe('SignupPage', () => {
  test('renders display name, email, password, confirm fields when arrived directly', () => {
    render(<SignupPage />)
    expect(screen.getByPlaceholderText('How should we greet you?')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('At least 6 characters')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your password again')).toBeInTheDocument()
  })

  test('blocks submit when passwords do not match', async () => {
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password124')
    await userEvent.click(screen.getByRole('checkbox'))
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  test('requires terms acceptance before submitting', async () => {
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(screen.getByText('Please accept the terms to continue')).toBeInTheDocument()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  test('shows error for short password', async () => {
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'abc')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'abc')
    await userEvent.click(screen.getByRole('checkbox'))
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  test('falls back to email prefix when no display name', async () => {
    mockSignUp.mockResolvedValueOnce({})
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    await userEvent.click(screen.getByRole('checkbox'))
    screen.getByRole('button', { name: /create account/i }).click()

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'test')
    })
  })

  test('after signup, shows plan picker with one CTA per plan', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('How should we greet you?'), 'Alice')
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    await userEvent.click(screen.getByRole('checkbox'))
    screen.getByRole('button', { name: /create account/i }).click()

    // We're now on the plan step — no navigation has happened yet.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Choose your plan/i })).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
    // One CTA per plan. Pro's CTA mentions the trial instead of plan name.
    expect(screen.getByRole('button', { name: /Use Kolumn for free/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Try Pro plan/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue with Team/i })).toBeInTheDocument()
  })

  test('Free plan CTA: navigates without writing to profiles', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    await userEvent.click(screen.getByRole('checkbox'))
    screen.getByRole('button', { name: /create account/i }).click()

    const freeCta = await screen.findByRole('button', { name: /Use Kolumn for free/i })
    freeCta.click()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
    // Free is the column default — skip the write.
    expect(mockSetTier).not.toHaveBeenCalled()
  })

  test('Pro plan CTA: setTier is called, then navigate', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { user: { id: 'u1' } } })
    mockSetTier.mockResolvedValueOnce({ tier: 'pro' })
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('At least 6 characters'), 'password123')
    await userEvent.type(screen.getByPlaceholderText('Type your password again'), 'password123')
    await userEvent.click(screen.getByRole('checkbox'))
    screen.getByRole('button', { name: /create account/i }).click()

    const proCta = await screen.findByRole('button', { name: /Try Pro plan/i })
    proCta.click()

    await waitFor(() => {
      expect(mockSetTier).toHaveBeenCalledWith('pro')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })
})
