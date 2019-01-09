import { Parser } from "../acorn.js"

import shared from "../shared.js"

function init() {
  const flyweight = new Parser

  function lookahead({ input, pos }) {
    flyweight.input = input
    flyweight.pos = pos
    flyweight.next()
    return flyweight
  }

  return lookahead
}

export default shared.inited
  ? shared.module.parseLookahead
  : shared.module.parseLookahead = init()
