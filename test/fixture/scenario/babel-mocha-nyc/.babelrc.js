"use strict"

module.exports = {
  plugins: [
    ["@babel/transform-runtime", {
      useESModules: true
    }],
  ],
  presets: [
    ["@babel/env", {
      modules: false,
      shippedProposals: true
    }]
  ],
  sourceMaps: false
}
