import { Parser } from "../acorn.js"

const flyweight = new Parser

function lookahead(parser) {
  flyweight.input = parser.input
  flyweight.pos = parser.pos
  flyweight.nextToken()
  return flyweight
}

export default lookahead
