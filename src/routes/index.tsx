import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { ClipboardPaste, Download, Moon, Sun, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SettingsPanel } from "@/components/settings-panel"
import { useClone } from "@/hooks/use-clone"
import { useTheme } from "@/hooks/use-theme"
import type { ArchiveFormat } from "@/lib/archive"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const [url, setUrl] = useState("")
  const [shallow, setShallow] = useState(true)
  const [format, setFormat] = useState<ArchiveFormat>("zip")
  const { status, startDownload, reset } = useClone()
  const { theme, toggleTheme } = useTheme()

  const isActive = status.state === "cloning" || status.state === "archiving"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isActive && url.trim()) {
      startDownload(url, { shallow, format })
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setUrl(text)
    } catch {
      // Clipboard permission denied - ignore silently
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleTheme}
        className="fixed top-4 right-4"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </Button>

      <div className="flex w-full max-w-lg flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">dgit</h1>
          <p className="text-sm text-muted-foreground">
            download git repositories from the browser
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="https://github.com/user/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isActive}
              className="pr-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handlePaste}
              disabled={isActive}
              className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Paste from clipboard"
            >
              <ClipboardPaste className="size-3.5" />
            </Button>
          </div>
          <Button type="submit" disabled={isActive || !url.trim()}>
            <Download className="size-4" />
            {isActive ? "..." : "Download"}
          </Button>
        </form>

        <SettingsPanel
          shallow={shallow}
          onShallowChange={setShallow}
          format={format}
          onFormatChange={setFormat}
          disabled={isActive}
        />

        <StatusDisplay
          state={status.state}
          progress={status.progress}
          error={status.error}
          onDismissError={reset}
        />
      </div>
    </div>
  )
}

function StatusDisplay({
  state,
  progress,
  error,
  onDismissError,
}: {
  state: string
  progress: { phase: string; loaded: number; total: number } | null
  error: string | null
  onDismissError: () => void
}) {
  if (state === "idle") return null

  if (state === "error" && error) {
    return (
      <div className="flex items-start justify-between border border-destructive/50 p-3 text-xs text-destructive">
        <span>[ERROR] {error}</span>
        <button
          onClick={onDismissError}
          className="ml-2 shrink-0 text-destructive/70 hover:text-destructive"
        >
          <X className="size-3" />
        </button>
      </div>
    )
  }

  if (state === "cloning") {
    const phaseText = progress?.phase ?? "connecting"
    const pct =
      progress && progress.total > 0
        ? Math.round((progress.loaded / progress.total) * 100)
        : null
    return (
      <div className="text-xs text-muted-foreground">
        [CLONING] {phaseText}
        {pct !== null ? ` ${pct}%` : ""}
      </div>
    )
  }

  if (state === "archiving") {
    return (
      <div className="text-xs text-muted-foreground">
        [ARCHIVING] creating archive...
      </div>
    )
  }

  if (state === "done") {
    return (
      <div className="text-xs text-muted-foreground">
        [DONE] download started
      </div>
    )
  }

  return null
}
