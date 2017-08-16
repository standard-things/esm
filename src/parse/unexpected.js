import raise from "./raise.js"

function unexpected(parser, pos) {
  if (typeof pos !== "number") {
    pos = parser.start
  }
  raise(parser, pos, "Unexpected token")
}

export default unexpected
