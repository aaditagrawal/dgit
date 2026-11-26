import * as stylex from "@stylexjs/stylex"
import { styles, classNames } from "@/ui.stylex"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import appCss from "../styles.css?url"

const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@/components/router-devtools").then((module) => ({
        default: module.RouterDevtools,
      }))
    )
  : null

export const Route = createRootRoute({
  notFoundComponent: () => (
    <div {...stylex.props(styles.notFound)}>
      <div {...stylex.props(styles.centered)}>
        <p className={classNames.subtitle}>[404] page not found</p>
        <a href="/" {...stylex.props(styles.homeLink)}>
          go home
        </a>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "dgit",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        children: `(function(){try{var t=localStorage.getItem("dgit-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {RouterDevtools ? (
          <Suspense fallback={null}>
            <RouterDevtools />
          </Suspense>
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
