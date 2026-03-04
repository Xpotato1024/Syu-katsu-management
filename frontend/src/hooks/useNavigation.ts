import { useCallback, useEffect, useState } from "react"
import type { ViewKey } from "../types"
import { parseViewFromHash, viewHash } from "../utils/view"

export function useNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState<ViewKey>(() => parseViewFromHash(window.location.hash))

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev)
  }, [])

  const navigateTo = useCallback((view: ViewKey) => {
    setIsMenuOpen(false)
    setActiveView(view)
    const hash = viewHash(view)
    if (window.location.hash !== hash) {
      window.location.hash = hash
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      setActiveView(parseViewFromHash(window.location.hash))
    }
    onHashChange()
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return {
    isMenuOpen,
    activeView,
    closeMenu,
    toggleMenu,
    navigateTo
  }
}
