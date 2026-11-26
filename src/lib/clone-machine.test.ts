import { describe, expect, it } from "vitest"
import {
  IDLE_PHASE,
  progressPercent,
  reduceClone,
  type ClonePhase,
} from "./clone-machine"

const options = { shallow: true, format: "zip" as const }
const parsed = {
  url: "https://github.com/user/repo.git",
  repoName: "repo",
  subpath: "docs",
}

describe("reduceClone", () => {
  it("keeps the idle object when reset is a no-op", () => {
    expect(reduceClone(IDLE_PHASE, { type: "reset" })).toBe(IDLE_PHASE)
  })

  it("ignores a new error while a download is in flight", () => {
    const cloning = reduceClone(IDLE_PHASE, { type: "begin", generation: 1 })
    expect(reduceClone(cloning, { type: "reject", error: "nope" })).toBe(
      cloning
    )
  })

  it("drops progress that would not change the displayed percent", () => {
    const cloning = reduceClone(IDLE_PHASE, { type: "begin", generation: 4 })
    const first = reduceClone(cloning, {
      type: "progress",
      generation: 4,
      progress: { phase: "Receiving objects", loaded: 10, total: 100 },
    })
    const samePercent = reduceClone(first, {
      type: "progress",
      generation: 4,
      progress: { phase: "Receiving objects", loaded: 10.4, total: 100 },
    })
    expect(samePercent).toBe(first)
    const nextPercent = reduceClone(first, {
      type: "progress",
      generation: 4,
      progress: { phase: "Receiving objects", loaded: 11, total: 100 },
    })
    expect(nextPercent).not.toBe(first)
    if (nextPercent.state !== "cloning") throw new Error("expected cloning")
    expect(progressPercent(nextPercent.progress)).toBe(11)
  })

  it("ignores stale generations after a newer clone has started", () => {
    const current = reduceClone(IDLE_PHASE, { type: "begin", generation: 2 })
    const stale = reduceClone(current, {
      type: "progress",
      generation: 1,
      progress: { phase: "Receiving objects", loaded: 80, total: 100 },
    })
    expect(stale).toBe(current)
    const failed = reduceClone(current, {
      type: "fail",
      generation: 1,
      error: "old failure",
    })
    expect(failed).toBe(current)
  })

  it("walks confirming → cloning → archiving → done", () => {
    const confirming = reduceClone(IDLE_PHASE, {
      type: "confirm",
      subpath: parsed.subpath,
      repoName: parsed.repoName,
      parsed,
      options,
    })
    const cloning = reduceClone(confirming, { type: "begin", generation: 3 })
    const archiving = reduceClone(cloning, {
      type: "archive",
      generation: 3,
      repoName: "docs",
    })
    const done = reduceClone(archiving, {
      type: "finish",
      generation: 3,
      repoName: "docs",
    })
    expect(confirming.state).toBe("confirming")
    expect(cloning.state).toBe("cloning")
    expect(archiving.state).toBe("archiving")
    expect(done).toEqual({ state: "done", repoName: "docs" })
  })

  it("returns to idle from an error", () => {
    const error: ClonePhase = { state: "error", error: "missing" }
    expect(reduceClone(error, { type: "reset" })).toBe(IDLE_PHASE)
  })
})
