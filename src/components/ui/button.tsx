import * as stylex from "@stylexjs/stylex"
import { styles } from "@/ui.stylex"
import * as React from "react"

import { Slot } from "radix-ui"
import type { ClassValue } from "clsx"

import { cn } from "@/lib/utils"

const variants = {
  default: styles.buttonDefault,
  outline: styles.buttonOutline,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  destructive: styles.buttonDestructive,
  link: styles.buttonLink,
}
const variantClasses = {
  default: "dgit-buttonDefault",
  outline: "dgit-buttonOutline",
  secondary: "dgit-buttonSecondary",
  ghost: "dgit-buttonGhost",
  destructive: "dgit-buttonDestructive",
  link: "dgit-buttonLink",
}
const sizes = {
  default: styles.buttonSizeDefault,
  xs: styles.buttonSizeXs,
  sm: styles.buttonSizeSm,
  lg: styles.buttonSizeLg,
  icon: styles.buttonSizeIcon,
  "icon-xs": styles.buttonSizeIconXs,
  "icon-sm": styles.buttonSizeIconSm,
  "icon-lg": styles.buttonSizeIconLg,
}
const sizeClasses = {
  default: "dgit-buttonSizeDefault",
  xs: "dgit-buttonSizeXs",
  sm: "dgit-buttonSizeSm",
  lg: "dgit-buttonSizeLg",
  icon: "dgit-buttonSizeIcon",
  "icon-xs": "dgit-buttonSizeIconXs",
  "icon-sm": "dgit-buttonSizeIconSm",
  "icon-lg": "dgit-buttonSizeIconLg",
}
interface ButtonVariantOptions {
  variant?: keyof typeof variants | null
  size?: keyof typeof sizes | null
  className?: ClassValue
  class?: ClassValue
}
function buttonVariants(options: ButtonVariantOptions = {}) {
  const variant = options.variant === undefined ? "default" : options.variant
  const size = options.size === undefined ? "default" : options.size
  return cn(
    stylex.props(
      styles.buttonBase,
      variant && variants[variant],
      size && sizes[size]
    ).className,
    "dgit-buttonBase",
    variant && variantClasses[variant],
    size && sizeClasses[size],
    options.class,
    options.className
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  Pick<ButtonVariantOptions, "variant" | "size"> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
