import { Parser } from "../acorn.js"

import shared from "../shared.js"

function init() {
  const flyweight = new Parser

  function lookahead(parser) {
    flyweight.input = parser.input
    flyweight.pos = parser.pos
    flyweight.nextToken()
    return flyweight
  }

  return lookahead
}

export default shared.inited
  ? shared.module.parseLookahead
  : shared.module.parseLookahead = init()
