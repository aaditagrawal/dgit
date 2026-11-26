import { describe, expect, it } from "vitest"
import {
  BASE_SPEED,
  DRIFT,
  HYPER_SPEED,
  driftBucket,
  stepFlight,
  streakBucket,
} from "./flight-machine"

describe("stepFlight", () => {
  it("returns the same drift step while hyperspace is off", () => {
    expect(stepFlight(DRIFT, false)).toBe(DRIFT)
  })

  it("reaches hyperspace speed within two frames and then stays put", () => {
    const boosting = stepFlight(DRIFT, true)
    const streaking = stepFlight(boosting, true)
    expect(boosting.mode).toBe("streak")
    expect(boosting.speed).toBeGreaterThan(BASE_SPEED)
    expect(streaking.speed).toBe(HYPER_SPEED)
    expect(stepFlight(streaking, true)).toBe(streaking)
  })

  it("coasts back to drift within four frames", () => {
    let flight = stepFlight(stepFlight(DRIFT, true), true)
    let frames = 0
    while (flight !== DRIFT && frames < 6) {
      flight = stepFlight(flight, false)
      frames += 1
    }
    expect(flight).toBe(DRIFT)
    expect(frames).toBeLessThanOrEqual(4)
  })
})

describe("draw buckets", () => {
  it("keeps drift and streak stars inside their batch tables", () => {
    expect(driftBucket(0.95, 0.3)).toBe(0)
    expect(driftBucket(0.1, 1)).toBe(3)
    expect(streakBucket(0.9, 0.3)).toBeGreaterThanOrEqual(0)
    expect(streakBucket(0.05, 1)).toBeLessThan(12)
  })
})
