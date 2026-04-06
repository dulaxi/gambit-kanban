import { createClient, processLock } from '@supabase/supabase-js'
import { env } from './env'

// Use processLock instead of the default navigator.locks-based lock.
// The default navigatorLock can leave orphaned locks after tab visibility
// changes (alt-tab) or React StrictMode double-mounts, causing every
// subsequent supabase.from(...) call to hang indefinitely while waiting
// to acquire the auth lock. processLock is a simple in-memory Promise queue
// scoped to the page lifecycle and cannot be orphaned.
// See: https://github.com/supabase/auth-js — search "navigatorLock orphaned"
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    lock: processLock,
  },
})
