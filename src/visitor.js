// Based on `PathVisitor()` of ast-types.
// Copyright Ben Newman. Released under MIT license:
// https://github.com/benjamn/ast-types

import isObject from "./util/is-object.js"
import keys from "./util/keys.js"
import shared from "./shared.js"

function init() {
  const childNamesMap = new Map

  const visitLookup = {
    __proto__: null,
    // ConditionalExpression
    alternate: true,
    // ReturnStatement
    argument: true,
    // CallExpression
    arguments: true,
    // TryStatement
    block: true,
    // BlockStatement, FunctionDeclaration, FunctionExpression
    body: true,
    // CallExpression
    callee: true,
    // SwitchStatement
    cases: true,
    // ConditionalExpression, SwitchCase
    consequent: true,
    // ExportDefaultDeclaration, ExportNamedDeclaration
    declaration: true,
    // VariableDeclaration
    declarations: true,
    // SwitchStatement
    discriminant: true,
    // ArrayPattern
    elements: true,
    // ExpressionStatement
    expression: true,
    // SequenceExpression, TemplateLiteral
    expressions: true,
    // TryStatement
    finalizer: true,
    // TryStatement
    handler: true,
    // ForStatement, VariableDeclarator
    init: true,
    // Property
    key: true,
    // AssignmentExpression, AssignmentPattern
    left: true,
    // MemberExpression
    object: true,
    // ObjectPattern
    properties: true,
    // AssignmentExpression, AssignmentPattern
    right: true,
    // ClassDeclaration
    superClass: true,
    // ForStatement, IfStatement, SwitchCase, WhileStatement
    test: true,
    // ForStatement
    update: true,
    // Property
    value: true
  }

  class Visitor {
    visit(rootPath, options) {
      this.reset(options)

      const possibleIndexes = this.possibleIndexes || []

      this.possibleEnd = possibleIndexes.length
      this.possibleIndexes = possibleIndexes
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

    const noComputed =
      value.type !== "Property" ||
      ! value.computed

    const names = keys(value)

    childNames = []

    for (const name of names) {
      if (noComputed &&
          name === "key") {
        continue
      }

      if (Reflect.has(visitLookup, name) &&
          isObject(value[name])) {
        childNames.push(name)
      }
    }

    childNamesMap.set(value, childNames)
    return childNames
  }

  Reflect.setPrototypeOf(Visitor.prototype, null)

  return Visitor
}

export default shared.inited
  ? shared.module.Visitor
  : shared.module.Visitor = init()
