"use strict"

module.exports = {
  plugins: [
    "@babel/transform-flow-strip-types"
  ],
  presets: [
    ["@babel/env", {
      modules: false
    }]
  ],
  sourceMaps: false
}
