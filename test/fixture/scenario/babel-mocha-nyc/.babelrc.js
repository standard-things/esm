"use strict"

module.exports = {
  plugins: [
    ["@babel/transform-runtime", {
      polyfill: false,
      useESModules: true
    }],
  ],
  presets: [
    ["@babel/env", {
      modules: false,
      shippedProposals: true
    }]
  ]
}
