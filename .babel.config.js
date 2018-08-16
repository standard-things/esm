"use strict"

function BabelEqEqEqPlugin() {
  return {
    visitor: {
      BinaryExpression({ node }) {
        const { operator } = node

        if ((operator === "==" ||
             operator === "!=") &&
            node.left.type !== "NullLiteral" &&
            node.right.type !== "NullLiteral") {
          node.operator += "="
        }
      }
    }
  }
}

const isTest = /test/.test(process.env.ESM_ENV)

module.exports = {
  env: {
    production: {
      plugins: [
        ["transform-remove-console", {
          exclude: ["error"]
        }],
        "transform-remove-debugger"
      ]
    }
  },
  plugins: [
    ["@babel/proposal-class-properties", {
      loose: true
    }],
    ["@babel/transform-arrow-functions", {
      spec: false
    }],
    ["@babel/transform-block-scoping", {
      throwIfClosureRequired: false
    }],
    ["transform-for-of-as-array", {
      loose: true
    }],
    BabelEqEqEqPlugin()
  ],
  presets: [
    ["@babel/env", {
      debug: isTest,
      exclude: [
        "transform-async-to-generator",
        "transform-for-of",
        "transform-function-name"
      ],
      loose: true,
      modules: false,
      targets: { node: 6 }
    }]
  ],
  sourceMap: false
}
