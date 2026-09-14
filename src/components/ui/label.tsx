"use client"

import * as stylex from "@stylexjs/stylex"
import { styles } from "@/ui.stylex"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Label({
  className,
  xstyle,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & {
  xstyle?: stylex.StyleXStyles
}) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        stylex.props(styles.labelBase, xstyle).className,
        "dgit-labelBase",
        className
      )}
      {...props}
    />
  )
}

export { Label }
