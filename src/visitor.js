// Based on `PathVisitor()` of ast-types.
// Copyright Ben Newman. Released under MIT license:
// https://github.com/benjamn/ast-types

import isObject from "./util/is-object.js"
import keys from "./util/keys.js"
import setPrototypeOf from "./util/set-prototype-of.js"
import shared from "./shared.js"

function init() {
  const childNamesMap = new Map

  const visitLookup = new Set([
    // ConditionalExpression
    "alternate",
    // ReturnStatement
    "argument",
    // CallExpression
    "arguments",
    // TryStatement
    "block",
    // BlockStatement, FunctionDeclaration, FunctionExpression
    "body",
    // CallExpression
    "callee",
    // SwitchStatement
    "cases",
    // ConditionalExpression, SwitchCase
    "consequent",
    // ExportDefaultDeclaration, ExportNamedDeclaration
    "declaration",
    // VariableDeclaration
    "declarations",
    // SwitchStatement
    "discriminant",
    // ArrayPattern
    "elements",
    // ExpressionStatement
    "expression",
    // SequenceExpression, TemplateLiteral
    "expressions",
    // TryStatement
    "finalizer",
    // TryStatement
    "handler",
    // ForStatement, VariableDeclarator
    "init",
    // Property
    "key",
    // AssignmentExpression, AssignmentPattern
    "left",
    // MemberExpression
    "object",
    // ObjectPattern
    "properties",
    // AssignmentExpression, AssignmentPattern
    "right",
    // ClassDeclaration
    "superClass",
    // ForStatement, IfStatement, SwitchCase, WhileStatement
    "test",
    // ForStatement
    "update",
    // Property
    "value"
  ])

  class Visitor {
    visit(rootPath, options) {
      this.reset(options)

      const { possibleIndexes } = this

      if (! Array.isArray(possibleIndexes) ||
          possibleIndexes.length === 0) {
        return
      }

      this.possibleEnd = possibleIndexes.length
      this.possibleStart = 0

      this.visitWithoutReset(rootPath)
    }

    visitWithoutReset(path) {
      const value = path.getValue()

      if (! isObject(value)) {
        return
      }

      if (Array.isArray(value)) {
        path.each(this, "visitWithoutReset")
        return
      }

      const methodName = "visit" + value.type

      if (typeof this[methodName] === "function") {
        // The method must call `this.visitChildren(path)` to continue traversing.
        this[methodName](path)
      } else {
        this.visitChildren(path)
      }
    }

    visitChildren(path) {
      const node = path.getValue()
      const { end, start } = node
      const { possibleIndexes } = this

      const oldLeft = this.possibleStart
      const oldRight = this.possibleEnd

      let left = oldLeft
      let right = oldRight

      if (typeof start === "number" &&
          typeof end === "number") {
        // Find first index not less than `node.start`.
        while (left < right &&
            possibleIndexes[left] < start) {
          left += 1
        }

        // Find first index not greater than `node.end`.
        while (left < right &&
            possibleIndexes[right - 1] > end) {
          right -= 1
        }
      }

      if (left < right) {
        this.possibleStart = left
        this.possibleEnd = right

        const names = getChildNames(node)

        for (const name of names) {
          path.call(this, "visitWithoutReset", name)
        }

        this.possibleStart = oldLeft
        this.possibleEnd = oldRight
      }
    }
  }

  function getChildNames(value) {
    let childNames = childNamesMap.get(value)

    if (childNames !== void 0) {
      return childNames
    }

    childNames = []

    const names = keys(value)

    const noComputed =
      value.type !== "Property" ||
      ! value.computed

    for (const name of names) {
      if (noComputed &&
          name === "key") {
        continue
      }

      if (visitLookup.has(name) &&
          isObject(value[name])) {
        childNames.push(name)
      }
    }

    childNamesMap.set(value, childNames)
    return childNames
  }

  setPrototypeOf(Visitor.prototype, null)

  return Visitor
}

export default shared.inited
  ? shared.module.Visitor
  : shared.module.Visitor = init()
