import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("joins class names in order without changing whitespace or duplicates", () => {
    const override = ["dgit-icon", "", "dgit-icon"].join(" ")
    expect(cn("dgit-button", override)).toBe("dgit-button dgit-icon  dgit-icon")
  })

  it("omits empty and absent conditional classes at every nesting level", () => {
    expect(
      cn(undefined, "", null, false, [], [false, ["dgit-base", ""]], "dgit-end")
    ).toBe("dgit-base dgit-end")
    expect(cn()).toBe("")
    expect(cn([undefined, [false, null, ""]])).toBe("")
  })

  it("supports component variants and optional class overrides without mutating arrays", () => {
    const optionalClass: string | undefined = undefined
    const classes = ["dgit-buttonBase", optionalClass]
    expect(cn(classes, false, "dgit-custom")).toBe(
      "dgit-buttonBase dgit-custom"
    )
    expect(classes).toEqual(["dgit-buttonBase", undefined])
  })
})
