import { classNames } from "@/ui.stylex"
import { memo, useCallback, useEffect, useRef } from "react"
import {
  DRIFT,
  driftBucket,
  stepFlight,
  streakBucket,
  type Flight,
} from "@/lib/flight-machine"
import { useMountEffect } from "@/hooks/use-mount-effect"

type StarfieldProps = {
  hyperspace: boolean
}

type Star = {
  x: number
  y: number
  z: number
  trailZ: number
  brightness: number
  px: number
  py: number
  tx: number
  ty: number
  bucket: number
}

type Playback = "playing" | "suspended"

const STAR_COUNT = 800
const DRIFT_FILLS = [
  "rgba(255, 255, 255, 0.22)",
  "rgba(255, 255, 255, 0.45)",
  "rgba(255, 255, 255, 0.7)",
  "rgba(255, 255, 255, 0.95)",
]
const STREAK_WIDTHS = [0.6, 1.4, 2.4]
const STREAK_ALPHA = [0.28, 0.5, 0.75, 1]
const STREAK_STYLES = STREAK_ALPHA.flatMap((alpha) =>
  STREAK_WIDTHS.map((width) => ({
    width,
    color: `rgba(255, 255, 255, ${alpha})`,
  }))
)

function emptyLists(count: number): Array<Array<number>> {
  const lists: Array<Array<number>> = []
  for (let index = 0; index < count; index++) lists.push([])
  return lists
}

export const Starfield = memo(function Starfield({
  hyperspace,
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hyperspaceRef = useRef(hyperspace)
  useEffect(() => {
    hyperspaceRef.current = hyperspace
  }, [hyperspace])

  const init = useCallback((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d")
    if (context === null) return
    const drawing = context

    const stars: Array<Star> = []
    const lists = emptyLists(12)
    let flight: Flight = DRIFT
    let playback: Playback = "playing"
    let animFrame = 0

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      drawing.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function resetStar(star: Star) {
      star.x = (Math.random() - 0.5) * 2
      star.y = (Math.random() - 0.5) * 2
      star.z = 0.8 + Math.random() * 0.2
      star.trailZ = star.z
      star.brightness = 0.3 + Math.random() * 0.7
    }

    function spawnStar(): Star {
      const star: Star = {
        x: 0,
        y: 0,
        z: 0,
        trailZ: 0,
        brightness: 0,
        px: 0,
        py: 0,
        tx: 0,
        ty: 0,
        bucket: 0,
      }
      resetStar(star)
      star.z = Math.random()
      star.trailZ = star.z
      return star
    }

    for (let index = 0; index < STAR_COUNT; index++) {
      stars.push(spawnStar())
    }

    function project(
      nx: number,
      ny: number,
      z: number,
      cx: number,
      cy: number,
      into: { x: number; y: number }
    ) {
      const scale = 1 / Math.max(z, 0.0001)
      into.x = nx * scale * cx + cx
      into.y = ny * scale * cy + cy
    }

    const head = { x: 0, y: 0 }
    const tail = { x: 0, y: 0 }

    function draw() {
      if (playback === "suspended") return

      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const cx = w / 2
      const cy = h / 2
      flight = stepFlight(flight, hyperspaceRef.current)
      const streaking = flight.mode === "streak"
      const dz = flight.speed * 0.005

      drawing.clearRect(0, 0, w, h)
      for (const list of lists) list.length = 0

      for (let index = 0; index < stars.length; index++) {
        const star = stars[index]
        if (star === undefined) continue
        star.z -= dz

        if (streaking) {
          const trailTarget = star.z + 0.12
          star.trailZ += (trailTarget - star.trailZ) * 0.25
          if (star.trailZ < star.z + 0.0005) star.trailZ = star.z + 0.0005
        } else {
          star.trailZ = star.z
        }

        project(star.x, star.y, star.z, cx, cy, head)
        star.px = head.x
        star.py = head.y

        const offScreen =
          head.x < -20 || head.x > w + 20 || head.y < -20 || head.y > h + 20
        if (offScreen || star.z <= 0.0001) {
          resetStar(star)
          continue
        }

        if (streaking) {
          project(star.x, star.y, star.trailZ, cx, cy, tail)
          star.tx = tail.x
          star.ty = tail.y
          star.bucket = streakBucket(star.z, star.brightness)
        } else {
          star.bucket = driftBucket(star.z, star.brightness)
        }
        lists[star.bucket]?.push(index)
      }

      if (streaking) paintStreaks(drawing, stars, lists)
      else paintDrift(drawing, stars, lists)

      if (playback === "playing") {
        animFrame = requestAnimationFrame(draw)
      }
    }

    function onVisibility() {
      if (document.hidden) {
        playback = "suspended"
        cancelAnimationFrame(animFrame)
        return
      }
      if (playback === "suspended") {
        playback = "playing"
        animFrame = requestAnimationFrame(draw)
      }
    }

    resize()
    window.addEventListener("resize", resize)
    document.addEventListener("visibilitychange", onVisibility)
    animFrame = requestAnimationFrame(draw)

    return () => {
      playback = "suspended"
      cancelAnimationFrame(animFrame)
      window.removeEventListener("resize", resize)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  useMountEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return init(canvas)
  })

  return <canvas ref={canvasRef} className={classNames.starfieldCanvas} />
})

function paintDrift(
  context: CanvasRenderingContext2D,
  stars: Array<Star>,
  lists: Array<Array<number>>
) {
  for (let bucket = 0; bucket < DRIFT_FILLS.length; bucket++) {
    const members = lists[bucket]
    if (members === undefined || members.length === 0) continue
    context.beginPath()
    for (const index of members) {
      const star = stars[index]
      if (star === undefined) continue
      const radius = Math.max((1 - star.z) * 1.8, 0.4)
      context.moveTo(star.px + radius, star.py)
      context.arc(star.px, star.py, radius, 0, Math.PI * 2)
    }
    const fill = DRIFT_FILLS[bucket]
    if (fill !== undefined) context.fillStyle = fill
    context.fill()
  }
}

function paintStreaks(
  context: CanvasRenderingContext2D,
  stars: Array<Star>,
  lists: Array<Array<number>>
) {
  for (let bucket = 0; bucket < lists.length; bucket++) {
    const members = lists[bucket]
    if (members === undefined || members.length === 0) continue
    const style = STREAK_STYLES[bucket]
    if (style === undefined) continue
    context.beginPath()
    for (const index of members) {
      const star = stars[index]
      if (star === undefined) continue
      context.moveTo(star.tx, star.ty)
      context.lineTo(star.px, star.py)
    }
    context.strokeStyle = style.color
    context.lineWidth = style.width
    context.stroke()
  }
}
