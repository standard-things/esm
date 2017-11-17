// A simplified version of acorn5-object-spread.
// Copyright Adrian Heine and UXtemple. Released under MIT license:
// https://github.com/adrianheine/acorn5-object-spread

import { types as tt } from "../vendor/acorn/src/tokentype.js"
import wrap from "../util/wrap.js"

function enable(parser) {
  parser.parseProperty = wrap(parser.parseProperty, parseProperty)
  return parser
}

function parseProperty(func, args) {
  const [isPattern] = args

  if (this.type !== tt.ellipsis) {
    return func.apply(this, args)
  }

  const propNode = this.parseSpread()

  if (isPattern) {
    propNode.type = "RestElement"
    propNode.value = this.toAssignable(propNode.argument)
  }

  return propNode
}

export { enable }
