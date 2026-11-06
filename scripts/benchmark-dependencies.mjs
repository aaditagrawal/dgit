// NODE_ENV=production bun scripts/benchmark-dependencies.mjs /path/to/clsx/dist/clsx.js
// Target baseline: 26a00f40b25290d2a55d3e55020e0c562f5c6cea, clsx 2.1.1.
// Supply the baseline externally; it is not a direct application dependency.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { cpus } from "node:os"
import { dirname, resolve } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { cn } from "../src/lib/utils.ts"

const [clsxEntry] = process.argv.slice(2)
assert(clsxEntry, "Pass the baseline clsx CommonJS entry path")
assert.equal(
  JSON.parse(
    readFileSync(resolve(dirname(clsxEntry), "../package.json"), "utf8")
  ).version,
  "2.1.1"
)
const clsx = createRequire(import.meta.url)(resolve(clsxEntry)).clsx
// This is the exact target-branch wrapper, including its extra array argument.
const baselineCn = (...inputs) => clsx(inputs)
const samples = Number(process.env.BENCH_SAMPLES ?? 31)
assert(
  Number.isInteger(samples) && samples > 0,
  "BENCH_SAMPLES must be a positive integer"
)
const warmups = 6
const results = []
let sink = 0
function batch(work, iterations) {
  for (let i = 0; i < iterations; i++) sink += work().length
}
function measure(name, baseline, candidate, iterations) {
  assert.equal(candidate(), baseline(), name)
  const timings = [[], []]
  for (let i = 0; i < warmups + samples; i++) {
    for (const side of i % 2 ? [1, 0] : [0, 1]) {
      const start = performance.now()
      batch(side ? candidate : baseline, iterations)
      if (i >= warmups)
        timings[side].push(((performance.now() - start) * 1e6) / iterations)
    }
  }
  const stats = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    return {
      median: sorted[Math.ceil(samples * 0.5) - 1],
      p95: sorted[Math.ceil(samples * 0.95) - 1],
    }
  }
  const [before, after] = timings.map(stats)
  results.push({
    name,
    iterations,
    unit: "ns/op",
    baseline: before,
    candidate: after,
    medianRatio: after.median / before.median,
    timings,
  })
}
let nested = ["dgit-base"]
for (let i = 0; i < 48; i++) nested = [false, nested, undefined]
const cases = [
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
  [
    "class/maps",
    [
      "base",
      { active: true, absent: false, pending: 1 },
      { inherited: [] },
      "override",
    ],
    100000,
  ],
]
for (const [name, values, iterations] of cases)
  measure(
    name,
    () => baselineCn(...values),
    () => cn(...values),
    iterations
  )

// Differential fixtures include empty keys, prototype keys, primitives and nesting.
const atoms = [
  "",
  "a",
  " b ",
  0,
  1,
  NaN,
  Infinity,
  null,
  undefined,
  true,
  false,
  1n,
  {},
  { "": true },
  { "": true, x: true },
  { x: true, "": true },
  ["a", false],
  Object.assign(Object.create({ inherited: true }), { own: true }),
]
let comparisons = 0
for (const a of atoms)
  for (const b of atoms)
    for (const c of [false, [a, b]]) {
      assert.equal(cn(a, b, c), baselineCn(a, b, c))
      comparisons++
    }
function renderButton(joinClasses) {
  return renderToStaticMarkup(
    createElement(
      "button",
      {
        className: joinClasses(...cases[1][1]),
        disabled: false,
        "aria-label": "Download repository",
      },
      "Download"
    )
  )
}
measure(
  "SSR/button",
  () => renderButton(baselineCn),
  () => renderButton(cn),
  2000
)
console.log(
  JSON.stringify(
    {
      baselineCommit: "26a00f40b25290d2a55d3e55020e0c562f5c6cea",
      baselinePackage: "clsx@2.1.1",
      runtime: process.versions,
      nodeEnv: process.env.NODE_ENV,
      machine: {
        cpu: cpus()[0]?.model,
        platform: process.platform,
        arch: process.arch,
      },
      samples,
      warmups,
      order: "alternating baseline/candidate",
      comparisons,
      results,
      sink,
      limitations:
        "Steady-state class composition and React SSR, excluding startup, compilation, install and network. Browser updates are measured separately.",
    },
    null,
    2
  )
)
