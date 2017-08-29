// A less strict version of the object rest/spread acorn plugin.
// Copyright Victor Homyakov. Released under MIT license:
// https://github.com/victor-homyakov/acorn-object-rest-spread

import raise from "../parse/raise.js"
import { types as tt } from "../vendor/acorn/src/tokentype.js"
import unexpected from "../parse/unexpected.js"
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
  const propHash = Object.create(null)

  node.properties = []

  this.next()

  while (! this.eat(tt.braceR)) {
    if (first) {
      first = false
    } else {
      if (! this.eat(tt.comma)) {
        unexpected(this)
      }

      if (this.afterTrailingComma(tt.braceR)) {
        break
      }
    }

    let startLoc
    let startPos
    let propNode = this.startNode()

    if (isPattern || refDestructuringErrors) {
      startPos = this.start
      startLoc = this.startLoc
    }

    // The rest/spread code is adapted from Babylon.
    // Copyright Babylon contributors. Released under MIT license:
    // https://github.com/babel/babylon/blob/master/src/parser/expression.js
    if (this.type === tt.ellipsis) {
      propNode = this.parseSpread(refDestructuringErrors)
      propNode.type = "SpreadElement"

      if (isPattern) {
        propNode.type = "RestElement"
        propNode.value = this.toAssignable(propNode.argument, true)
      }

      node.properties.push(propNode)
      continue
    }

    propNode.method =
    propNode.shorthand = false

    const isGenerator = ! isPattern && this.eat(tt.star)

    this.parsePropertyName(propNode)

    let isAsync = false

    if (! isPattern &&
        ! isGenerator &&
        isAsyncProp(this, propNode)) {
      isAsync = true
      this.parsePropertyName(propNode, refDestructuringErrors)
    }

    this.parsePropertyValue(propNode, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors)
    this.checkPropClash(propNode, propHash)
    node.properties.push(this.finishNode(propNode, "Property"))
  }

  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
}

function toAssignable(func, args) {
  const [node, isBinding] = args

  if (node && node.type === "ObjectExpression") {
    node.type = "ObjectPattern"
    const { properties } = node

    for (const propNode of properties) {
      if (propNode.kind === "init") {
        this.toAssignable(propNode.value, isBinding)
      } else if (propNode.type === "SpreadElement") {
        propNode.value = this.toAssignable(propNode.argument, isBinding)
      } else {
        raise(this, propNode.key.start, "Object pattern can't contain getter or setter")
      }
    }

    return node
  }

  return func.apply(this, args)
}

function isAsyncProp(parser, propNode) {
  return typeof parser.isAsyncProp === "function"
    ? parser.isAsyncProp(propNode)
    : parser.toks.isAsyncProp(propNode)
}

export { enable }
