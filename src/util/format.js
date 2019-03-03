import emptyObject from "./empty-object.js"
import formatWithOptions from "./format-with-options.js"
import shared from "../shared.js"

function init() {
  function format(...args) {
    return formatWithOptions(emptyObject, ...args)
  }

  return format
}

export default shared.inited
  ? shared.module.utilFormat
  : shared.module.utilFormat = init()
