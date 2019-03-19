"use strict"

const arrayRemove = require("./script/array-remove.js")
const babel = require("@babel/core")

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

function BabelModePlugin({ types }) {
  // Based on `isInStrictMode()`.
  // Copyright Sebastian McKenzie and other contributors. Released under MIT license:
  // https://github.com/babel/babel/blob/master/packages/babel-traverse/src/path/introspection.js

  function isInMode(path) {
    const parent = path.find((path) => {
      if (path.isClass()) {
        return true
      }

      const isFunc = path.isFunction()

      if (! isFunc &&
          ! path.isProgram()) {
        return false
      }

      const node = isFunc
        ? path.node.body
        : path.node

      const { directives } = node

      let { length } = directives

      while (length--) {
        const { value } = directives[length].value

        if (value === "use sloppy" ||
            value === "use strict") {
          return true
        }
      }
    })

    return parent !== null
  }

  function isSimpleParameterList(params) {
    return params.every(({ type }) => type === "Identifier")
  }

  function enterFunction(path) {
    const { node } = path
    const { directives } = node.body

    if (directives &&
        isSimpleParameterList(node.params) &&
        ! isInMode(path)) {
      directives.push(types.directive(types.directiveLiteral("use strict")))
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

function BabelOrderPlugin(plugins) {
  return {
    visitor: {
      Program(path) {
        for (const plugin of plugins) {
          path.traverse(plugin(babel).visitor)
        }
      }
    }
  }
}

function BabelRemoveSloppyPlugin() {
  function enterFunction({ node: { body: directives } }) {
    arrayRemove(directives, ({ value: { value } }) => value === "use sloppy")
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
    BabelOrderPlugin([
      BabelEqEqEqPlugin,
      BabelModePlugin,
      BabelRemoveSloppyPlugin
    ])
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
