export const stylexOptions = {
  dev: process.env.NODE_ENV !== "production",
  runtimeInjection: false,
  treeshakeCompensation: true,
  styleResolution: "property-specificity",
  unstable_moduleResolution: { type: "commonJS" },
}
