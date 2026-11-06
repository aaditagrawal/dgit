// bun scripts/benchmark-rendering.mjs /path/to/clsx/dist/clsx.js
// Compares the target 26a00f4 class helper against the replacement with identical icons.
// Requires Chrome and baseline packages supplied separately, never runtime dependencies.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { cpus, tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const [clsxEntry] = process.argv.slice(2)
assert(clsxEntry, "Pass the baseline clsx CommonJS entry path")
const require = createRequire(import.meta.url)
const project = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const chrome = process.env.CHROME_BIN || "google-chrome"
const samples = Number(process.env.BENCH_SAMPLES ?? 31)
assert(
  Number.isInteger(samples) && samples > 0,
  "BENCH_SAMPLES must be a positive integer"
)
for (const [entry, relativePackage, name, version] of [
  [clsxEntry, "../package.json", "clsx", "2.1.1"],
]) {
  const metadata = JSON.parse(
    await readFile(resolve(dirname(entry), relativePackage), "utf8")
  )
  assert.equal(metadata.name, name)
  assert.equal(metadata.version, version)
}

const directory = await mkdtemp(join(tmpdir(), "dgit-render-benchmark-"))
try {
  const entry = `
import { createElement } from ${JSON.stringify(require.resolve("react"))};
import { createRoot } from ${JSON.stringify(require.resolve("react-dom/client"))};
import { flushSync } from ${JSON.stringify(require.resolve("react-dom"))};
import { clsx } from ${JSON.stringify(resolve(clsxEntry))};
import * as icons from ${JSON.stringify(require.resolve("lucide-react"))};
import { cn } from ${JSON.stringify(join(project, "src/lib/utils.ts"))};
const baselineCn = (...inputs) => clsx(inputs);
const names = ["ChevronDown", "ClipboardPaste", "Download", "Moon", "Sun", "X"];
const sizes = [12,14,16,16,16,12];
const host = document.getElementById("host");
const root = createRoot(host);
let sink = 0;
function update(joinClasses, count, index) {
  flushSync(() => root.render(createElement("button", {
    className: joinClasses("dgit-buttonBase", "dgit-buttonDefault", index % 2 && "dgit-active"),
    disabled: index % 2 === 0,
    "aria-label": "Download repository",
  }, ...Array.from({ length: count }, (_, item) => createElement(icons[names[item % 6]], {
    key: item,
    className: "dgit-icon icon-" + item % 6,
    "data-stylex-sized": true,
    strokeWidth: index % 2 ? 1.5 : 2,
  })), "Download")));
  // Include synchronous style and layout work; do not measure only React scheduling.
  sink += host.firstElementChild.getBoundingClientRect().width;
}
const results = [];
let nested = ["dgit-base"];
for(let i=0;i<48;i++) nested=[false,nested,undefined];
const classCases = [
  ["browser/class-small",["dgit-icon",undefined],400000],
  ["browser/class-button",["compiled-stylex","dgit-buttonBase","dgit-buttonDefault","dgit-buttonSizeSm",false,undefined,"dgit-override"],200000],
  ["browser/class-large",Array.from({length:128},(_,i)=>[i%2?"dgit-active":false,"dgit-item"]),4000],
  ["browser/class-nested",nested,10000],
  ["browser/class-maps",["base",{active:true,absent:false,pending:1},{inherited:[]},"override"],100000]
];
for(const [name,values,iterations] of classCases){
  if(cn(...values)!==baselineCn(...values)) throw Error("Changed classes");
  const timings=[[],[]];
  for(let pair=0;pair<6+${samples};pair++) for(const side of pair%2?[1,0]:[0,1]) {
    const joinClasses=side?cn:baselineCn;
    const start=performance.now();
    for(let i=0;i<iterations;i++) sink+=joinClasses(...values).length;
    if(pair>=6) timings[side].push((performance.now()-start)*1e6/iterations);
  }
  const stats=values=>{
    const sorted=[...values].sort((a,b)=>a-b);
    return {median:sorted[Math.ceil(sorted.length*.5)-1],p95:sorted[Math.ceil(sorted.length*.95)-1]};
  };
  results.push({name,iterations,unit:"ns/op",baseline:stats(timings[0]),candidate:stats(timings[1]),samples:timings});
}

for (const [name, count, iterations] of [["browser/button-one",1,400],["browser/icons-six",6,250],["browser/icons-large",192,12]]) {
  const timings = [[],[]];
  const batch = (side) => {
    update(side === 0 ? baselineCn : cn, count, -1);
    const start = performance.now();
    for (let i=0; i<iterations; i++) update(side === 0 ? baselineCn : cn, count, i);
    return (performance.now() - start) * 1000 / iterations;
  };
  // Both implementations must retain actual CSS dimensions and decorative SVG semantics.
  let beforeMarkup;
  for (const side of [0,1]) {
    update(side === 0 ? baselineCn : cn, count, 0);
    if(side === 0) beforeMarkup = host.innerHTML;
    else if(host.innerHTML !== beforeMarkup) throw Error("Changed rendered markup");
    const svgs = [...host.querySelectorAll("svg")];
    if (svgs.length !== count) throw Error("Missing icons");
    svgs.forEach((svg, i) => {
      const rect = svg.getBoundingClientRect();
      if (rect.width !== sizes[i % 6] || rect.height !== sizes[i % 6] || svg.getAttribute("aria-hidden") !== "true") throw Error("Changed SVG sizing or accessibility");
    });
  }
  for(let i=0; i<6; i++) { batch(0); batch(1); }
  for(let i=0; i<${samples}; i++) for(const side of i % 2 ? [1,0] : [0,1]) timings[side].push(batch(side));
  const stats = values => {
    const sorted = [...values].sort((a,b)=>a-b);
    return {median:sorted[Math.ceil(sorted.length*0.5)-1],p95:sorted[Math.ceil(sorted.length*0.95)-1]};
  };
  results.push({name, iterations, unit:"us/update including layout", baseline:stats(timings[0]), candidate:stats(timings[1]), samples:timings});
}
root.unmount();
document.getElementById("benchmark-result").textContent = JSON.stringify({samples:${samples},warmups:6,order:"alternating baseline/candidate",results,sink});
`
  await writeFile(join(directory, "entry.tsx"), entry)
  const build = await Bun.build({
    entrypoints: [join(directory, "entry.tsx")],
    outdir: directory,
    target: "browser",
    format: "iife",
    minify: true,
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "shared-react",
        setup(builder) {
          builder.onResolve(
            { filter: /^react(?:\/jsx-runtime)?$/ },
            (args) => ({
              path: require.resolve(args.path),
            })
          )
        },
      },
    ],
  })
  assert(build.success, build.logs.map(String).join("\n"))
  await writeFile(
    join(directory, "index.html"),
    '<!doctype html><meta charset="utf-8"><style>button{display:inline-flex;align-items:center;gap:6px}.dgit-icon{flex:none}.icon-0,.icon-5{width:12px;height:12px}.icon-1{width:14px;height:14px}.icon-2,.icon-3,.icon-4{width:16px;height:16px}</style><div id="host"></div><pre id="benchmark-result"></pre><script src="entry.js"></script>'
  )
  const html = execFileSync(
    chrome,
    [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-extensions",
      "--num-raster-threads=2",
      "--renderer-process-limit=1",
      `--user-data-dir=${join(directory, "profile")}`,
      "--dump-dom",
      `file://${join(directory, "index.html")}`,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 }
  )
  const match = html.match(/<pre id="benchmark-result">([^<]+)<\/pre>/)
  assert(match, `Browser benchmark did not complete: ${html.slice(-2000)}`)
  console.log(
    JSON.stringify(
      {
        baselineCommit: "26a00f40b25290d2a55d3e55020e0c562f5c6cea",
        baselinePackages: { clsx: "2.1.1" },
        browser: execFileSync(chrome, ["--version"], {
          encoding: "utf8",
        }).trim(),
        runtime: process.versions,
        cpu: cpus()[0]?.model,
        ...JSON.parse(match[1]),
        limitations:
          "Production React DOM updates with forced layout, not compositor paint, hydration or full-app startup. Compilation and process startup excluded. Both sides use the same retained Lucide icons; markup, dimensions, accessibility and update counts match. No virtual clock.",
      },
      null,
      2
    )
  )
} finally {
  await rm(directory, { recursive: true, force: true })
}
