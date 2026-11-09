import { classNames, styles } from "@/ui.stylex"
import { createFileRoute } from "@tanstack/react-router"
import {
  lazy,
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react"
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
import { preloadDownloadRuntime, useClone } from "@/hooks/use-clone"
import { useTheme } from "@/hooks/use-theme"
import { scheduleIdle } from "@/lib/schedule-idle"
import {
  isDownloadBusy,
  progressPercent,
  type ClonePhase,
} from "@/lib/clone-machine"

const Starfield = lazy(() =>
  import("@/components/starfield").then((module) => ({
    default: module.Starfield,
  }))
)

export const Route = createFileRoute("/")({ component: App })

function App() {
  const [url, setUrl] = useState("")
  const [shallow, setShallow] = useState(true)
  const [format, setFormat] = useState<ArchiveFormat>("zip")
  const { phase, startDownload, chooseDownload, reset } = useClone()
  const { theme, toggleTheme } = useTheme()

  const isActive = isDownloadBusy(phase)
  const prompt = phase.state === "confirming" ? phase : null
  const chooseFull = useCallback(() => chooseDownload("full"), [chooseDownload])
  const chooseSubfolder = useCallback(
    () => chooseDownload("subfolder"),
    [chooseDownload]
  )
  const actionLabel = downloadActionLabel(phase)

  useEffect(() => scheduleIdle(() => void preloadDownloadRuntime()), [])

  const handleUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setUrl(value)
      if (value !== "") void preloadDownloadRuntime()
    },
    []
  )

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
                onChange={handleUrlChange}
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
            <Button
              type="submit"
              disabled={isActive || !url.trim()}
              aria-busy={isActive}
              className="dgit-downloadButton"
            >
              {isActive ? null : (
                <Download data-stylex-sized className={classNames.icon} />
              )}
              {actionLabel}
            </Button>
          </form>

          <StatusDisplay phase={phase} onDismissError={reset} />

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
        </div>
      </div>

      <div className={classNames.starPanel}>
        <IdleStarfield hyperspace={isActive} />
      </div>

      {/* Subfolder prompt */}
      <AlertDialog open={prompt !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Subfolder detected</AlertDialogTitle>
            <AlertDialogDescription className={classNames.dialogOverflow}>
              Your URL points to{" "}
              <span className={classNames.subpath}>{prompt?.subpath}</span> in{" "}
              <span className={classNames.repoName}>{prompt?.repoName}</span>.
              Download just this folder, or the entire repository?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={chooseFull}>
              Full repository
            </AlertDialogCancel>
            <AlertDialogAction onClick={chooseSubfolder}>
              Just subfolder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function IdleStarfield({ hyperspace }: { hyperspace: boolean }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let active = true
    const cancel = scheduleIdle(() => {
      if (!active) return
      startTransition(() => setShow(true))
    })
    return () => {
      active = false
      cancel()
    }
  }, [])
  if (!show) return null
  return (
    <Suspense fallback={null}>
      <Starfield hyperspace={hyperspace} />
    </Suspense>
  )
}

function DownloadMeter({
  phase,
}: {
  phase: Extract<ClonePhase, { state: "cloning" | "archiving" }>
}) {
  const pct =
    phase.state === "archiving" ? 100 : progressPercent(phase.progress)
  const detail =
    phase.state === "archiving"
      ? "creating archive"
      : (phase.progress?.phase ?? "connecting")
  const prefix = phase.state === "archiving" ? "ARCHIVING" : "CLONING"
  const indeterminate = pct === null
  return (
    <div className="dgit-progressBlock">
      <div
        className="dgit-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : pct}
        aria-valuetext={indeterminate ? detail : `${detail} ${pct}%`}
        aria-label="Download progress"
      >
        <div
          className={
            indeterminate
              ? "dgit-progressFill dgit-progressIndeterminate"
              : "dgit-progressFill"
          }
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
      <p className={classNames.smallMuted}>
        [{prefix}] {detail}
        {indeterminate ? "" : ` ${pct}%`}
      </p>
    </div>
  )
}

function downloadActionLabel(phase: ClonePhase): string {
  if (phase.state === "cloning") {
    const pct = progressPercent(phase.progress)
    return pct === null ? "Connecting" : `${pct}%`
  }
  if (phase.state === "archiving") return "Archiving"
  return "Download"
}

function StatusDisplay({
  phase,
  onDismissError,
}: {
  phase: ClonePhase
  onDismissError: () => void
}) {
  switch (phase.state) {
    case "idle":
    case "confirming":
      return null
    case "error":
      return (
        <div className={classNames.errorBox}>
          <span>[ERROR] {phase.error}</span>
          <button onClick={onDismissError} className={classNames.dismissError}>
            <X data-stylex-sized className={classNames.smallIcon} />
          </button>
        </div>
      )
    case "cloning":
    case "archiving":
      return <DownloadMeter phase={phase} />
    case "done":
      return (
        <div className={classNames.smallMuted}>
          [DONE] downloaded {phase.repoName}
        </div>
      )
  }
}
