export const BASE_SPEED = 0.3
export const HYPER_SPEED = 30

export type FlightMode = "drift" | "streak"

export type Flight = {
  mode: FlightMode
  speed: number
}

export const DRIFT: Flight = { mode: "drift", speed: BASE_SPEED }

const BOOST_SHARE = 0.5
const BRAKE_SHARE = 1 / 3
const STREAK_SPEED = 1.5

/**
 * Starfield flight. Hyperspace is a command, not the rendered mode.
 * Entering and leaving it covers the speed gap in a couple of frames —
 * this transition stays superfast and is not on the UI easing budget.
 * Settled steps return the same object so the canvas can skip extra work.
 */
export function stepFlight(flight: Flight, hyperspace: boolean): Flight {
  if (hyperspace) {
    if (flight.speed >= HYPER_SPEED) {
      return flight.mode === "streak" && flight.speed === HYPER_SPEED
        ? flight
        : { mode: "streak", speed: HYPER_SPEED }
    }
    return {
      mode: "streak",
      speed: Math.min(
        HYPER_SPEED,
        flight.speed + (HYPER_SPEED - BASE_SPEED) * BOOST_SHARE
      ),
    }
  }

  if (flight.mode === "drift" && flight.speed === BASE_SPEED) return flight

  const speed = Math.max(
    BASE_SPEED,
    flight.speed - (HYPER_SPEED - BASE_SPEED) * BRAKE_SHARE
  )
  if (speed <= STREAK_SPEED) return DRIFT
  return { mode: "streak", speed }
}

/** Four fill buckets, from dim to bright, used while drifting. */
export function driftBucket(z: number, brightness: number): number {
  const alpha = brightness * Math.min((1 - z) * 1.5, 1)
  if (alpha > 0.75) return 3
  if (alpha > 0.5) return 2
  if (alpha > 0.25) return 1
  return 0
}

/** Twelve stroke buckets: 4 alpha bands × 3 line widths. */
export function streakBucket(z: number, brightness: number): number {
  const alpha = brightness * Math.min((1 - z) * 1.5, 1)
  const boosted = Math.min(alpha * 1.5, 1)
  const alphaBand =
    boosted > 0.75 ? 3 : boosted > 0.5 ? 2 : boosted > 0.25 ? 1 : 0
  const depth = 1 - z
  const widthBand = depth > 0.66 ? 2 : depth > 0.33 ? 1 : 0
  return alphaBand * 3 + widthBand
}
