"use strict"

const { types } = require("@babel/core")

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

function BabelModePlugin() {
  // Based on `isInStrictMode()`.
  // Copyright Sebastian McKenzie and other contributors. Released under MIT license:
  // https://github.com/babel/babel/blob/master/packages/babel-traverse/src/path/introspection.js

  function isInMode(path) {
    const parent = path.find((path) => {
      if (path.isClass()) {
        return true
      }

      if (! path.isProgram() &&
          ! path.isFunction()) {
        return false
      }

      if (path.isArrowFunctionExpression() &&
          ! path.get("body").isBlockStatement()) {
        return false
      }

      let { node } = path

      if (path.isFunction()) {
        node = node.body
      }

      for (const directive of node.directives) {
        const { value } = directive.value

        if (value === "use sloppy" ||
            value === "use strict") {
          return true
        }
      }
    })

    return !! parent
  }

  function isSimpleParameterList(params) {
    return params.every(({ type }) => type === "Identifier")
  }

  function enterFunction(path) {
    const { node } = path

    if (isSimpleParameterList(node.params) &&
        ! isInMode(path)) {
      node.body.directives.push(types.directive(types.directiveLiteral("use strict")))
    }
  }

  return {
    visitor: {
      ArrowFunctionExpression: enterFunction,
      FunctionDeclaration: enterFunction,
      FunctionExpression: enterFunction
    }
  }
}

function BabelRemoveSloppyPlugin() {
  function enterFunction({ node }) {
    const { directives } = node.body

    let { length } = directives

    while (length--) {
      if (directives[length].value.value === "use sloppy") {
        directives.splice(length, 1)
      }
    }
  }

  return {
    visitor: {
      ArrowFunctionExpression: enterFunction,
      FunctionDeclaration: enterFunction,
      FunctionExpression: enterFunction
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
    "@babel/proposal-optional-catch-binding",
    ["@babel/transform-arrow-functions", {
      spec: false
    }],
    ["@babel/transform-block-scoping", {
      throwIfClosureRequired: false
    }],
    ["transform-for-of-as-array", {
      loose: true
    }],
    BabelEqEqEqPlugin(),
    BabelModePlugin(),
    BabelRemoveSloppyPlugin()
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
  sourceMaps: false
}
