"use strict"

module.exports = {
  plugins: [
    ["@babel/proposal-class-properties", {
      loose: true
    }]
  ],
  presets: [
    ["@babel/env", {
      modules: false
    }]
  ],
  sourceMaps: false
}
