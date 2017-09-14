import unexpected from "./unexpected.js"

function expect(parser, type) {
  parser.eat(type) || unexpected(parser)
}

export default expect
