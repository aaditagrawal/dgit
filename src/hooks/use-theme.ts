import { useCallback, useEffect, useSyncExternalStore } from "react"
import {
  preferenceFrom,
  toggledPreference,
  type ThemeName,
  type ThemePreference,
} from "@/lib/theme-machine"

const SERVER_PREFERENCE: ThemePreference = { source: "system", theme: "light" }

let snapshot: ThemePreference = SERVER_PREFERENCE
let synced = false
const listeners = new Set<() => void>()
let media: MediaQueryList | null = null

function readStored(): ThemeName | null {
  try {
    const stored = localStorage.getItem("dgit-theme")
    if (stored === "light" || stored === "dark") return stored
    return null
  } catch {
    return null
  }
}

function systemTheme(): ThemeName {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function readPreference(): ThemePreference {
  return preferenceFrom(readStored(), systemTheme())
}

function applyTheme(theme: ThemeName) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

function publish(next: ThemePreference) {
  if (next.source === snapshot.source && next.theme === snapshot.theme) return
  snapshot = next
  applyTheme(next.theme)
  for (const listener of listeners) listener()
}

function onExternalChange() {
  if (!synced) return
  publish(readPreference())
}

function ensureMedia() {
  if (media !== null) return
  media = window.matchMedia("(prefers-color-scheme: dark)")
  media.addEventListener("change", onExternalChange)
  window.addEventListener("storage", onExternalChange)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  ensureMedia()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && media !== null) {
      media.removeEventListener("change", onExternalChange)
      window.removeEventListener("storage", onExternalChange)
      media = null
    }
  }
}

function getClientSnapshot(): ThemePreference {
  if (!synced) {
    synced = true
    snapshot = readPreference()
  }
  return snapshot
}

function getServerSnapshot(): ThemePreference {
  return SERVER_PREFERENCE
}

export function useTheme() {
  const preference = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  )

  useEffect(() => {
    // The server snapshot is only for hydration. Apply the client preference
    // so the pre-paint theme script is not overwritten with light.
    const resolved =
      preference === SERVER_PREFERENCE ? getClientSnapshot() : preference
    applyTheme(resolved.theme)
  }, [preference])

  const toggleTheme = useCallback(() => {
    const next = toggledPreference(getClientSnapshot())
    try {
      localStorage.setItem("dgit-theme", next.theme)
    } catch {
      // Storage can be unavailable in private browsing.
    }
    synced = true
    publish(next)
  }, [])

  return {
    theme: preference.theme,
    source: preference.source,
    toggleTheme,
  }
}
