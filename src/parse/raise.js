import AcornParser from "../acorn-parser.js"

import assign from "../util/assign.js"

const acornRaise = AcornParser.prototype.raise

function raise(parser, pos, message, ErrorCtor) {
  if (typeof ErrorCtor !== "function") {
    acornRaise.call(parser, pos, message)
  }

  try {
    acornRaise.call(parser, pos, message)
  } catch (e) {
    throw assign(new ErrorCtor(e.message), e)
  }
}

export default raise
