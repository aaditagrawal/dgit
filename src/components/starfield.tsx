import { useCallback, useRef } from "react"
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
}

const STAR_COUNT = 800
const BASE_SPEED = 0.3
const HYPER_SPEED = 30
const TRANSITION_RATE = 0.08

export function Starfield({ hyperspace }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hyperspaceRef = useRef(hyperspace)
  hyperspaceRef.current = hyperspace

  const init = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const stars: Array<Star> = []
    let currentSpeed = BASE_SPEED
    let animFrame = 0

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx!.scale(dpr, dpr)
    }

    function resetStar(star: Star) {
      star.x = (Math.random() - 0.5) * 2
      star.y = (Math.random() - 0.5) * 2
      star.z = 0.8 + Math.random() * 0.2
      star.trailZ = star.z
      star.brightness = 0.3 + Math.random() * 0.7
    }

    function spawnStar(): Star {
      const star: Star = { x: 0, y: 0, z: 0, trailZ: 0, brightness: 0 }
      resetStar(star)
      star.z = Math.random()
      star.trailZ = star.z
      return star
    }

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(spawnStar())
    }

    resize()
    window.addEventListener("resize", resize)

    function project(nx: number, ny: number, z: number, cx: number, cy: number) {
      const scale = 1 / Math.max(z, 0.0001)
      return { x: nx * scale * cx + cx, y: ny * scale * cy + cy }
    }

    function draw() {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const cx = w / 2
      const cy = h / 2

      const targetSpeed = hyperspaceRef.current ? HYPER_SPEED : BASE_SPEED
      currentSpeed += (targetSpeed - currentSpeed) * TRANSITION_RATE

      ctx!.clearRect(0, 0, w, h)

      const isStreaking = currentSpeed > 1.5
      const dz = currentSpeed * 0.005

      for (const star of stars) {
        star.z -= dz

        // Trail z lerps toward star z with lag for streak length
        const trailTarget = star.z + 0.12
        star.trailZ += (trailTarget - star.trailZ) * 0.25
        star.trailZ = Math.max(star.trailZ, star.z + 0.0005)

        const head = project(star.x, star.y, star.z, cx, cy)

        // Only respawn when the HEAD is off-screen
        const offScreen =
          head.x < -20 || head.x > w + 20 || head.y < -20 || head.y > h + 20

        if (offScreen || star.z <= 0.0001) {
          resetStar(star)
          continue
        }

        const alpha = star.brightness * Math.min((1 - star.z) * 1.5, 1)

        if (isStreaking) {
          const tail = project(star.x, star.y, star.trailZ, cx, cy)

          ctx!.beginPath()
          ctx!.moveTo(tail.x, tail.y)
          ctx!.lineTo(head.x, head.y)
          ctx!.strokeStyle = `rgba(255, 255, 255, ${Math.min(alpha * 1.5, 1)})`
          ctx!.lineWidth = Math.max((1 - star.z) * 2.5, 0.5)
          ctx!.stroke()
        } else {
          const radius = Math.max((1 - star.z) * 1.8, 0.4)
          ctx!.beginPath()
          ctx!.arc(head.x, head.y, radius, 0, Math.PI * 2)
          ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx!.fill()
        }
      }

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener("resize", resize)
    }
  }, [])

  useMountEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return init(canvas)
  })

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ background: "black" }}
    />
  )
}
