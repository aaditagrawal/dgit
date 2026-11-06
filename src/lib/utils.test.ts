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

describe("class-value compatibility", () => {
  it("preserves numeric values and ignores booleans and bigints", () => {
    expect(cn(0, 1, -2, NaN, Infinity, true, false, 1n)).toBe("1 -2 Infinity")
  })

  it("includes truthy inherited keys and preserves object enumeration order", () => {
    const inherited = { inherited: true, ignored: false }
    const classes = { own: 1, absent: null, nested: [], __proto__: inherited }
    expect(cn("start", classes, "end")).toBe("start own nested inherited end")
  })

  it("keeps empty object keys local to their container", () => {
    expect(cn("start", { "": true }, "end")).toBe("start end")
    expect(cn("start", [{ x: true, "": true }], "end")).toBe("start x  end")
    expect(cn("start", { "": true, x: true }, "end")).toBe("start x end")
  })

  it("supports sparse and deeply nested arrays", () => {
    const sparse = new Array<string>(3)
    sparse[1] = "middle"
    expect(cn("first", sparse, "last")).toBe("first middle last")
    let nested: import("./utils").ClassValue = "leaf"
    for (let depth = 0; depth < 48; depth++) nested = [false, nested, undefined]
    expect(cn("root", nested)).toBe("root leaf")
  })

  it("reads class-map getters once and preserves errors", () => {
    let reads = 0
    const classes = {
      get active() {
        reads++
        return true
      },
    }
    expect(cn(classes)).toBe("active")
    expect(reads).toBe(1)
    const failure = new Error("unavailable class")
    expect(() =>
      cn({
        get active() {
          throw failure
        },
      })
    ).toThrow(failure)
  })
})

it("accepts typed class maps without requiring an index signature", () => {
  interface Flags {
    active: boolean
  }
  const flags: Flags = { active: true }
  expect(cn(flags)).toBe("active")
})

it("retains array getter reads and the original traversal bound", () => {
  let reads = 0
  const classes = ["first", "last"]
  Object.defineProperty(classes, 0, {
    get() {
      reads++
      classes.push("late")
      return "first"
    },
  })
  expect(cn(classes)).toBe("first last")
  expect(reads).toBe(2)
})

it("formats second array getter reads even when they become falsy numbers", () => {
  for (const value of [0, NaN, "", null, undefined, false]) {
    let reads = 0
    const classes = ["placeholder"]
    Object.defineProperty(classes, 0, {
      get() {
        return ++reads % 2 ? true : value
      },
    })
    const expected = value === 0 ? "0" : Number.isNaN(value) ? "NaN" : ""
    expect(cn("before", classes, "after")).toBe(
      expected ? `before ${expected} after` : "before after"
    )
  }
})
