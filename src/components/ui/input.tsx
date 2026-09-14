import * as stylex from "@stylexjs/stylex"
import { styles } from "@/ui.stylex"
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  xstyle,
  type,
  ...props
}: React.ComponentProps<"input"> & { xstyle?: stylex.StyleXStyles }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        stylex.props(styles.inputBase, xstyle).className,
        "dgit-inputBase",
        className
      )}
      {...props}
    />
  )
}

export { Input }
