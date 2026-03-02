import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

export function useIsMobile() {
  return !useMediaQuery('(min-width: 640px)')
}

export function useIsTablet() {
  const aboveMobile = useMediaQuery('(min-width: 640px)')
  const belowDesktop = !useMediaQuery('(min-width: 1024px)')
  return aboveMobile && belowDesktop
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)')
}
