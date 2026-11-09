import { describe, expect, it } from "vitest"
import { preferenceFrom, toggledPreference } from "./theme-machine"

describe("theme preference", () => {
  it("follows the system until the user chooses a theme", () => {
    expect(preferenceFrom(null, "dark")).toEqual({
      source: "system",
      theme: "dark",
    })
    expect(preferenceFrom("light", "dark")).toEqual({
      source: "chosen",
      theme: "light",
    })
  })

  it("toggle stores an explicit choice of the opposite theme", () => {
    expect(toggledPreference({ source: "system", theme: "dark" })).toEqual({
      source: "chosen",
      theme: "light",
    })
    expect(toggledPreference({ source: "chosen", theme: "light" })).toEqual({
      source: "chosen",
      theme: "dark",
    })
  })
})
