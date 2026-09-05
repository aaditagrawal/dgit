import { stylexOptions } from "./stylex.config.js"
const config = {
  plugins: {
    "@stylexjs/postcss-plugin": {
      include: ["src/**/*.stylex.js"],
      babelConfig: {
        babelrc: false,
        configFile: false,
        plugins: [["@stylexjs/babel-plugin", stylexOptions]],
      },
      useCSSLayers: false,
    },
  },
}

export default config
