import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ArchiveFormat } from "@/lib/archive"

type SettingsPanelProps = {
  shallow: boolean
  onShallowChange: (value: boolean) => void
  format: ArchiveFormat
  onFormatChange: (value: ArchiveFormat) => void
  disabled?: boolean
}

export function SettingsPanel({
  shallow,
  onShallowChange,
  format,
  onFormatChange,
  disabled,
}: SettingsPanelProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
        Settings
        <ChevronDown className="size-3 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 flex flex-col gap-4 border border-border p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="history" className="text-xs">
              Include full git history
            </Label>
            <Switch
              id="history"
              checked={!shallow}
              onCheckedChange={(checked) => onShallowChange(!checked)}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="format" className="text-xs">
              Format
            </Label>
            <Select
              value={format}
              onValueChange={(v) => onFormatChange(v as ArchiveFormat)}
              disabled={disabled}
            >
              <SelectTrigger id="format" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zip">ZIP</SelectItem>
                <SelectItem value="tar.gz">TAR.GZ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
