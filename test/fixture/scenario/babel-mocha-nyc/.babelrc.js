"use strict"

module.exports = {
  plugins: [
    ["@babel/transform-runtime", {
      polyfill: false,
      useBuiltIns: true,
      useESModules: true,
    }],
  ],
  presets: [
    ["@babel/env", {
      modules: false,
      shippedProposals: true,
      targets: {
        node: "4",
      },
    }],
  ],
  sourceMaps: "inline"
}
