/** Run after the first paint so route JS and input stay ahead of optional work. */
export function scheduleIdle(work: () => void): () => void {
  const id = window.requestIdleCallback(() => {
    work()
  })
  return () => {
    window.cancelIdleCallback(id)
  }
}
