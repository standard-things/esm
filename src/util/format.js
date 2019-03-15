import emptyObject from "./empty-object.js"
import formatWithOptions from "./format-with-options.js"

function format(...args) {
  return formatWithOptions(emptyObject, ...args)
}

export default format
