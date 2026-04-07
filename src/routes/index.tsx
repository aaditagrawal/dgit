import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { ChevronDown, ClipboardPaste, Download, Moon, Sun, X } from "lucide-react"
import type { ArchiveFormat } from "@/lib/archive"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Starfield } from "@/components/starfield"
import { useClone } from "@/hooks/use-clone"
import { useTheme } from "@/hooks/use-theme"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const [url, setUrl] = useState("")
  const [shallow, setShallow] = useState(true)
  const [format, setFormat] = useState<ArchiveFormat>("zip")
  const { status, subpathPrompt, startDownload, reset } = useClone()
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
      // Clipboard permission denied
    }
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Left panel: UI */}
      <div className="relative z-10 flex flex-shrink-0 flex-col items-center justify-center px-6 py-12 md:flex-1 md:p-12">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="absolute top-4 right-4"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        <div className="flex w-full max-w-md flex-col gap-6">
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
                className="border-chart-3 pr-9 text-chart-1 placeholder:text-chart-5 focus-visible:border-chart-2 focus-visible:ring-chart-2/50"
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

          <Collapsible>
            <CollapsibleTrigger className="group flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
              Settings
              <ChevronDown className="size-3 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="history" className="text-xs">
                      {shallow ? "Latest version only" : "Full git history"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {shallow
                        ? "Toggle for full git history"
                        : "Includes all commits (slower)"}
                    </p>
                  </div>
                  <Switch
                    id="history"
                    checked={!shallow}
                    onCheckedChange={(checked) => setShallow(!checked)}
                    disabled={isActive}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs">Format</p>
                  <div className="flex">
                    <button
                      type="button"
                      disabled={isActive}
                      onClick={() => setFormat("zip")}
                      className={`border px-4 py-1.5 text-xs transition-colors ${
                        format === "zip"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      } disabled:pointer-events-none disabled:opacity-50`}
                    >
                      ZIP
                    </button>
                    <button
                      type="button"
                      disabled={isActive}
                      onClick={() => setFormat("tar.gz")}
                      className={`-ml-px border px-4 py-1.5 text-xs transition-colors ${
                        format === "tar.gz"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      } disabled:pointer-events-none disabled:opacity-50`}
                    >
                      TAR.GZ
                    </button>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <StatusDisplay
            state={status.state}
            progress={status.progress}
            error={status.error}
            repoName={status.repoName}
            onDismissError={reset}
          />
        </div>
      </div>

      {/* Right panel: Starfield */}
      <div className="relative min-h-0 flex-1 overflow-hidden md:h-auto">
        <Starfield hyperspace={isActive} />
      </div>

      {/* Subfolder prompt */}
      <AlertDialog open={subpathPrompt !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Subfolder detected</AlertDialogTitle>
            <AlertDialogDescription>
              Your URL points to{" "}
              <span className="font-mono text-foreground">
                {subpathPrompt?.subpath}
              </span>{" "}
              in{" "}
              <span className="font-mono text-foreground">
                {subpathPrompt?.repoName}
              </span>
              . Download just this folder, or the entire repository?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => subpathPrompt?.resolve("full")}>
              Full repository
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => subpathPrompt?.resolve("subfolder")}
            >
              Just /{subpathPrompt?.subpath}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatusDisplay({
  state,
  progress,
  error,
  repoName,
  onDismissError,
}: {
  state: string
  progress: { phase: string; loaded: number; total: number } | null
  error: string | null
  repoName: string | null
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
        [DONE] downloaded {repoName ?? "repository"}
      </div>
    )
  }

  return null
}
