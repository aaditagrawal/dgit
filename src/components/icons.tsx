import type { ComponentProps } from "react"

type IconProps = ComponentProps<"svg">

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={
        props["aria-label"] || props["aria-labelledby"] ? undefined : true
      }
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function ChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 8.5 7 7 7-7" />
    </Icon>
  )
}

export function ClipboardPaste(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 4.5H5.5v16h13V13M16 4.5h2.5v3" />
      <rect x="8" y="2.5" width="8" height="4" rx="1" />
      <path d="M11 11h10m-3-3 3 3-3 3M8.5 16.5h5" />
    </Icon>
  )
}

export function Download(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v12m-4-4 4 4 4-4M4.5 16v4.5h15V16" />
    </Icon>
  )
}

export function Moon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 3.5A9 9 0 1 0 20.5 16 7.5 7.5 0 0 1 15 3.5Z" />
    </Icon>
  )
}

export function Sun(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v3m0 13v3M2.5 12h3m13 0h3M5.3 5.3l2.1 2.1m9.2 9.2 2.1 2.1M5.3 18.7l2.1-2.1m9.2-9.2 2.1-2.1" />
    </Icon>
  )
}

export function X(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6.5 6.5 11 11m0-11-11 11" />
    </Icon>
  )
}
