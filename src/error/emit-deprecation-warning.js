import emitWarning from "./emit-warning.js"

function emitDeprecationWarning(message, code) {
  emitWarning(message, "DeprecationWarning", code, emitDeprecationWarning)
}

export default emitDeprecationWarning
