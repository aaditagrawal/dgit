// NODE_ENV=production bun scripts/benchmark-dependencies.mjs /path/to/clsx/dist/clsx.js /path/to/lucide-react/dist/cjs/lucide-react.js
// Baseline: 9c789d5f34474f6c7572f8e3d6503be048a71c96, clsx 2.1.1 and lucide-react 1.60.0.
// Baseline packages are supplied separately and are never application dependencies.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import Module, { createRequire } from "node:module"
import { cpus } from "node:os"
import { dirname, resolve } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { cn } from "../src/lib/utils.ts"
import * as ownedIcons from "../src/components/icons.tsx"

const [clsxEntry, lucideEntry] = process.argv.slice(2)
assert(clsxEntry && lucideEntry, "Pass the two baseline CommonJS entry paths")
const root = resolve(import.meta.dirname, "..")
assert.equal(
  JSON.parse(
    readFileSync(resolve(dirname(clsxEntry), "../package.json"), "utf8")
  ).version,
  "2.1.1"
)
assert.equal(
  JSON.parse(
    readFileSync(resolve(dirname(lucideEntry), "../../package.json"), "utf8")
  ).version,
  "1.60.0"
)
const require = createRequire(import.meta.url)
const baselineClass = require(resolve(clsxEntry)).clsx
// Match the committed src/lib/utils.ts wrapper, including its array argument.
const baselineCn = (...inputs) => baselineClass(inputs)
// Redirect only the baseline React import to share the renderer's instance.
const baselineModule = new Module(resolve(lucideEntry))
baselineModule.filename = resolve(lucideEntry)
baselineModule.paths = [resolve(root, "node_modules")]
const baselineSource = readFileSync(lucideEntry, "utf8")
const reactImport = "require('react')"
assert(baselineSource.includes(reactImport))
baselineModule._compile(
  baselineSource.replace(
    reactImport,
    "require(" + JSON.stringify(require.resolve("react")) + ")"
  ),
  resolve(lucideEntry)
)
const baselineIcons = baselineModule.exports
const iconNames = [
  "ChevronDown",
  "ClipboardPaste",
  "Download",
  "Moon",
  "Sun",
  "X",
]
const samples = Number(process.env.BENCH_SAMPLES ?? 31)
const warmups = 6
const results = []
let sink = 0

function runBatch(work, iterations) {
  let bytes = 0
  for (let i = 0; i < iterations; i++) bytes += work().length
  sink += bytes
}

function measure(name, baseline, candidate, iterations) {
  const before = []
  const after = []
  for (let i = 0; i < warmups; i++) {
    runBatch(baseline, iterations)
    runBatch(candidate, iterations)
  }
  for (let sample = 0; sample < samples; sample++) {
    const pair =
      sample % 2 === 0
        ? [
            [baseline, before],
            [candidate, after],
          ]
        : [
            [candidate, after],
            [baseline, before],
          ]
    for (const [work, timings] of pair) {
      const start = performance.now()
      runBatch(work, iterations)
      timings.push(((performance.now() - start) * 1e6) / iterations)
    }
  }
  before.sort((a, b) => a - b)
  after.sort((a, b) => a - b)
  const percentile = (times, p) => times[Math.ceil(times.length * p) - 1]
  results.push({
    name,
    iterations,
    unit: "ns/op",
    baseline: {
      median: percentile(before, 0.5),
      p95: percentile(before, 0.95),
    },
    candidate: { median: percentile(after, 0.5), p95: percentile(after, 0.95) },
    medianRatio: percentile(after, 0.5) / percentile(before, 0.5),
  })
}

let nested = ["dgit-base"]
for (let i = 0; i < 48; i++) nested = [false, nested, undefined]
const classCases = [
  ["class/small", ["dgit-icon", undefined], 400000],
  [
    "class/button",
    [
      "compiled-stylex",
      "dgit-buttonBase",
      "dgit-buttonDefault",
      "dgit-buttonSizeSm",
      false,
      undefined,
      "dgit-override",
    ],
    200000,
  ],
  [
    "class/large",
    Array.from({ length: 128 }, (_, i) => [
      i % 2 ? "dgit-active" : false,
      "dgit-item",
    ]),
    4000,
  ],
  ["class/nested", nested, 10000],
]
for (const [name, values, iterations] of classCases) {
  assert.equal(cn(...values), baselineCn(...values))
  measure(
    name,
    () => baselineCn(...values),
    () => cn(...values),
    iterations
  )
}

function renderIcons(icons, count, named = false) {
  return renderToStaticMarkup(
    createElement(
      "div",
      null,
      Array.from({ length: count }, (_, index) => {
        const name = iconNames[index % iconNames.length]
        return createElement(icons[name], {
          key: index,
          className: index % 2 ? "dgit-smallIcon" : "dgit-icon",
          "data-stylex-sized": true,
          "aria-label": named ? name : undefined,
        })
      })
    )
  )
}
for (const [name, count, named, iterations] of [
  ["SSR/icons-small", 1, false, 300],
  ["SSR/icons-six", 6, false, 60],
  ["SSR/icons-large", 192, false, 2],
  ["SSR/icons-named", 6, true, 60],
]) {
  measure(
    name,
    () => renderIcons(baselineIcons, count, named),
    () => renderIcons(ownedIcons, count, named),
    iterations
  )
}

const buttonClasses = classCases[1][1]
function renderButton(joinClasses, icons) {
  return renderToStaticMarkup(
    createElement(
      "button",
      {
        className: joinClasses(...buttonClasses),
        disabled: false,
        "aria-label": "Download repository",
      },
      createElement(icons.Download, {
        className: "dgit-icon",
        "data-stylex-sized": true,
      }),
      "Download"
    )
  )
}
measure(
  "SSR/button-integration",
  () => renderButton(baselineCn, baselineIcons),
  () => renderButton(cn, ownedIcons),
  300
)

console.log(
  JSON.stringify(
    {
      baselineCommit: "9c789d5f34474f6c7572f8e3d6503be048a71c96",
      baselinePackages: { clsx: "2.1.1", "lucide-react": "1.60.0" },
      runtime: process.versions,
      nodeEnv: process.env.NODE_ENV ?? "development",
      machine: {
        cpu: cpus()[0]?.model,
        platform: process.platform,
        arch: process.arch,
      },
      samples,
      warmups,
      order: "alternating baseline/candidate",
      results,
      sink,
      limitations:
        "Local Bun microbenchmarks and React SSR only; browser paint, hydration, network and full-app startup are not measured. Icon artwork differs, while dimensions, roles and call counts are preserved.",
    },
    null,
    2
  )
)
