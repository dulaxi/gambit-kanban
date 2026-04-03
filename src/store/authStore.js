import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    // Use onAuthStateChange as the sole session source (Supabase v2 best practice).
    // INITIAL_SESSION fires synchronously on registration, replacing getSession().
    // This avoids the internal auth lock deadlock that occurs when both are used.
    let initialResolved = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      set({ user: session?.user || null, session })

      if (session?.user) {
        try {
          await get().fetchProfile()
        } catch (err) {
          console.error('Failed to fetch profile on auth change:', err)
        }
      } else {
        set({ profile: null })
      }

      // Mark loading complete after the first event (INITIAL_SESSION)
      if (!initialResolved) {
        initialResolved = true
        set({ loading: false })
      }
    })

    // Safety net: if INITIAL_SESSION never fires (shouldn't happen), unblock after 3s
    setTimeout(() => {
      if (!initialResolved) {
        initialResolved = true
        set({ loading: false })
      }
    }, 3000)
  },

  fetchProfile: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) {
      set({ profile: data })
    }
  },

  signUp: async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })
    if (error) throw error
    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    }
    set({ user: null, session: null, profile: null })
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) throw error
  },

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    set({ profile: data })
    return data
  },
}))
