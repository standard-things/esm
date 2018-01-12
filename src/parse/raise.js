import AcornError from "../acorn-error.js"

function raise(parser, pos, message, ErrorCtor) {
  const error = new AcornError(parser, pos, message)

  if (typeof ErrorCtor === "function") {
    throw new ErrorCtor(error.message)
  }

  throw error
}

export default raise
