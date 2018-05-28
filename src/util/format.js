import formatWithOptions from "./format-with-options.js"
import shared from "../shared.js"

function init() {
  const emptyOptions = {}

  function format(...args) {
    return formatWithOptions(emptyOptions, ...args)
  }

  return format
}

export default shared.inited
  ? shared.module.utilFormat
  : shared.module.utilFormat = init()
