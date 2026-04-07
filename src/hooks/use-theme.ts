import { useState, useCallback } from "react"
import { useMountEffect } from "@/hooks/use-mount-effect"

type Theme = "light" | "dark"

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function getStoredTheme(): Theme | null {
  return localStorage.getItem("dgit-theme") as Theme | null
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light")

  useMountEffect(() => {
    const resolved = getStoredTheme() ?? getSystemTheme()
    setTheme(resolved)
    applyTheme(resolved)

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      if (!getStoredTheme()) {
        const sys = getSystemTheme()
        setTheme(sys)
        applyTheme(sys)
      }
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  })

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark"
      localStorage.setItem("dgit-theme", next)
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
