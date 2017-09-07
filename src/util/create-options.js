import NullObject from "../null-object.js"

import defaults from "./defaults.js"

function createOptions(options, defaultOptions) {
  return defaults(new NullObject, options, defaultOptions)
}

export default createOptions
