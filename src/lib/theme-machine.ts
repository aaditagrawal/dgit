export type ThemeName = "light" | "dark"

/** `system` follows the OS. `chosen` is an explicit override stored locally. */
export type ThemePreference =
  | { source: "system"; theme: ThemeName }
  | { source: "chosen"; theme: ThemeName }

export function preferenceFrom(
  stored: ThemeName | null,
  system: ThemeName
): ThemePreference {
  if (stored === null) return { source: "system", theme: system }
  return { source: "chosen", theme: stored }
}

export function toggledPreference(current: ThemePreference): ThemePreference {
  const theme = current.theme === "dark" ? "light" : "dark"
  return { source: "chosen", theme }
}
