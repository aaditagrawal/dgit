import { useEffect } from "react"

export function useMountEffect(effect: () => void | (() => void)) {
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only effect
  useEffect(effect, [])
}
