// A simplified version of acorn5-object-spread.
// Copyright Adrian Heine and UXtemple. Released under MIT license:
// https://github.com/adrianheine/acorn5-object-spread

import { types as tt } from "../vendor/acorn/src/tokentype.js"
import wrap from "../util/wrap.js"

function enable(parser) {
  parser.checkLVal = wrap(parser.checkLVal, checkLVal)
  parser.toAssignable = wrap(parser.toAssignable, toAssignable)
  parser.parseProperty = wrap(parser.parseProperty, parseProperty)
  return parser
}

function checkLVal(func, args) {
  const [expr] = args
  const { type } = expr

  if (type === "ObjectPattern") {
    for (const propNode of expr.properties) {
      this.checkLVal(propNode)
    }
  } else if (type === "Property") {
    this.checkLVal(expr.value)
  } else {
    func.apply(this, args)
  }
}

function parseProperty(func, args) {
  const [isPattern, refDestructuringErrors] = args

  if (this.type !== tt.ellipsis) {
    return func.apply(this, args)
  }

  const propNode = this.parseSpread(refDestructuringErrors)

  if (isPattern) {
    propNode.value = this.toAssignable(propNode)
  } else if (this.type === tt.comma &&
      refDestructuringErrors && refDestructuringErrors.trailingComma === -1) {
    refDestructuringErrors.trailingComma = this.start
  }

  return propNode
}

function toAssignable(func, args) {
  const [node] = args

  if (node === null) {
    return node
  }

  const { type } = node

  if (type === "ObjectExpression") {
    node.type = "ObjectPattern"

    for (const propNode of node.properties) {
      this.toAssignable(propNode)
    }

    return node
  }

  if (type === "Property") {
    if (node.kind !== "init") {
      this.raise(node.key.start, "Object pattern can't contain getter or setter")
    }

    return this.toAssignable(node.value)
  }

  if (type === "SpreadElement") {
    node.type = "RestElement"
    return this.toAssignable(node.argument)
  }

  return func.apply(this, args)
}

export { enable }
