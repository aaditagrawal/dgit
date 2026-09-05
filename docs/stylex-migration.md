# StyleX migration

Component styles are defined in `src/ui.stylex.js` and compiled by the scoped Vite Babel transform and StyleX PostCSS extraction. Tailwind, its Vite plugin, tailwind-merge, and the Tailwind-based shadcn generator configuration are removed.

`reset.css` preserves the previous theme, browser reset, animation keyframes, and registered custom properties. The retained `--tw-*` variable names preserve the exact existing shadow, transform, and animation composition; they require no Tailwind runtime or build plugin. License notices are adjacent to the stylesheet.

`ui-states.css` preserves semantic Radix state and structural selectors. Its unlayered rules override the `stylex` layer, as the original utility states overrode base styles. New component styles should use StyleX definitions; the semantic classes are state hooks, not a utility framework.

Input and Label accept `xstyle` for compiler-aware override composition. The history label explicitly removes the base leading override, matching the former tailwind-merge behavior when text-xs followed leading-none. Icons with explicit sizes use `data-stylex-sized` to preserve the original button descendant size exclusion.

Validation compares every non-custom computed CSS property and every DOM rectangle against a baseline production build. Verified home and settings in both themes, history and archive format selections, subfolder dialog, and the 404 page at mobile and desktop sizes including exact 640 and 768 pixel breakpoints. Dialog layout comparisons disable transitions in both browser fixtures to avoid sampling different intermediate animation frames. The starfield algorithm and all download/network behavior are unchanged; random canvas pixels are not used for comparison.
