import { Parser } from "../acorn.js"

import shared from "../shared.js"

function init() {
  const flyweight = new Parser({
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    ecmaVersion: 10
  })

  function lookahead(parser) {
    flyweight.inModule = parser.inModule
    flyweight.input = parser.input
    flyweight.pos = parser.pos
    flyweight.strict = parser.strict

    flyweight.next()

    return flyweight
  }

  return lookahead
}

export default shared.inited
  ? shared.module.parseLookahead
  : shared.module.parseLookahead = init()
