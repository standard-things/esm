import AcornParser from "../acorn-parser.js"

const acornParser = new AcornParser

function lookahead(parser) {
  acornParser.input = parser.input
  acornParser.pos = parser.pos
  acornParser.nextToken()
  return acornParser
}

export default lookahead
