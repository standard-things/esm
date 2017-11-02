// A less strict version of the object rest/spread acorn plugin.
// Copyright Victor Homyakov. Released under MIT license:
// https://github.com/victor-homyakov/acorn-object-rest-spread

import { types as tt } from "../vendor/acorn/src/tokentype.js"
import wrap from "../util/wrap.js"

function enable(parser) {
  parser.parseObj = wrap(parser.parseObj, parseObj)
  parser.toAssignable = wrap(parser.toAssignable, toAssignable)
  return parser
}

function parseObj(func, args) {
  let first = true
  const [isPattern, refDestructuringErrors] = args
  const node = this.startNode()

  node.properties = []

  this.next()

  while (! this.eat(tt.braceR)) {
    if (first) {
      first = false
    } else {
      this.expect(tt.comma)

      if (this.afterTrailingComma(tt.braceR)) {
        break
      }
    }

    let propNode

    // The rest/spread code is adapted from Babylon.
    // Copyright Babylon contributors. Released under MIT license:
    // https://github.com/babel/babel/blob/master/packages/babylon/src/parser/expression.js
    if (this.type === tt.ellipsis) {
      propNode = this.parseSpread()
      propNode.type = "SpreadElement"

      if (isPattern) {
        propNode.type = "RestElement"
        propNode.value = this.toAssignable(propNode.argument, true)
      }
    } else {
      propNode = this.parseProperty(isPattern, refDestructuringErrors)
    }

    node.properties.push(propNode)
  }

  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
}

function toAssignable(func, args) {
  const [node] = args

  if (node && node.type === "ObjectExpression") {
    node.type = "ObjectPattern"

    for (const propNode of node.properties) {
      if (propNode.kind === "init") {
        this.toAssignable(propNode.value)
      } else if (propNode.type === "SpreadElement") {
        propNode.value = this.toAssignable(propNode.argument)
      } else {
        this.raise(propNode.key.start, "Object pattern can't contain getter or setter")
      }
    }

    return node
  }

  return func.apply(this, args)
}

export { enable }
