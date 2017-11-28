"use strict"

const isTest = /test/.test(process.env.NODE_ENV)

module.exports = {
  plugins: [
    ["@babel/proposal-class-properties", {
      loose: true
    }],
    ["@babel/transform-block-scoping", {
      throwIfClosureRequired: false
    }],
    "transform-for-of-as-array"
  ],
  presets: [
    ["@babel/env", {
      loose: true,
      modules: false,
      exclude: [
        "transform-async-to-generator",
        "transform-classes",
        "transform-for-of",
        "transform-function-name",
        "transform-object-super",
        "transform-regenerator"
      ],
      targets: { node: 4 },
      debug: isTest
    }]
  ]
}
