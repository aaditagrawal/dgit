import { classNames, styles } from "@/ui.stylex"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  ChevronDown,
  ClipboardPaste,
  Download,
  Moon,
  Sun,
  X,
} from "lucide-react"
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
    <div className={classNames.appShell}>
      {/* Left panel: UI */}
      <div className={classNames.leftPanel}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className={classNames.themeToggle}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun data-stylex-sized className={classNames.icon} />
          ) : (
            <Moon data-stylex-sized className={classNames.icon} />
          )}
        </Button>

        <div className={classNames.formColumn}>
          <div>
            <h1 className={classNames.title}>dgit</h1>
            <p className={classNames.subtitle}>
              download git repositories from the browser
            </p>
          </div>

          <form onSubmit={handleSubmit} className={classNames.form}>
            <div className={classNames.inputWrap}>
              <Input
                type="text"
                placeholder="https://github.com/user/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isActive}
                xstyle={styles.repositoryInput}
                className="dgit-repositoryInput"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handlePaste}
                disabled={isActive}
                className={classNames.pasteButton}
                aria-label="Paste from clipboard"
              >
                <ClipboardPaste
                  data-stylex-sized
                  className={classNames.pasteIcon}
                />
              </Button>
            </div>
            <Button type="submit" disabled={isActive || !url.trim()}>
              <Download data-stylex-sized className={classNames.icon} />
              {isActive ? "..." : "Download"}
            </Button>
          </form>

          <Collapsible>
            <CollapsibleTrigger className={classNames.settingsToggle}>
              Settings
              <ChevronDown
                data-stylex-sized
                className={classNames.settingsChevron}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className={classNames.settingsFields}>
                <div className={classNames.settingRow}>
                  <div>
                    <Label
                      htmlFor="history"
                      xstyle={styles.labelText}
                      className="dgit-smallText"
                    >
                      {shallow ? "Latest version only" : "Full git history"}
                    </Label>
                    <p className={classNames.smallMuted}>
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
                <div className={classNames.settingRow}>
                  <p className={classNames.smallText}>Format</p>
                  <div className={classNames.formatGroup}>
                    <button
                      type="button"
                      disabled={isActive}
                      onClick={() => setFormat("zip")}
                      className={[
                        classNames.formatButton,
                        format === "zip"
                          ? classNames.formatSelected
                          : classNames.formatUnselected,
                      ].join(" ")}
                    >
                      ZIP
                    </button>
                    <button
                      type="button"
                      disabled={isActive}
                      onClick={() => setFormat("tar.gz")}
                      className={[
                        classNames.formatButton,
                        classNames.formatOverlap,
                        format === "tar.gz"
                          ? classNames.formatSelected
                          : classNames.formatUnselected,
                      ].join(" ")}
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
      <div className={classNames.starPanel}>
        <Starfield hyperspace={isActive} />
      </div>

      {/* Subfolder prompt */}
      <AlertDialog open={subpathPrompt !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Subfolder detected</AlertDialogTitle>
            <AlertDialogDescription className={classNames.dialogOverflow}>
              Your URL points to{" "}
              <span className={classNames.subpath}>
                {subpathPrompt?.subpath}
              </span>{" "}
              in{" "}
              <span className={classNames.repoName}>
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
              Just subfolder
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
      <div className={classNames.errorBox}>
        <span>[ERROR] {error}</span>
        <button onClick={onDismissError} className={classNames.dismissError}>
          <X data-stylex-sized className={classNames.smallIcon} />
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
      <div className={classNames.smallMuted}>
        [CLONING] {phaseText}
        {pct !== null ? ` ${pct}%` : ""}
      </div>
    )
  }

  if (state === "archiving") {
    return (
      <div className={classNames.smallMuted}>
        [ARCHIVING] creating archive...
      </div>
    )
  }

  if (state === "done") {
    return (
      <div className={classNames.smallMuted}>
        [DONE] downloaded {repoName ?? "repository"}
      </div>
    )
  }

  return null
}
