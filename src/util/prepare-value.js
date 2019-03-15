import Loader from "../loader.js"

import isStackTraceMaskable from "./is-stack-trace-maskable.js"
import maskStackTrace from "../error/mask-stack-trace.js"

function prepareValue(value) {
  if (! Loader.state.package.default.options.debug &&
      isStackTraceMaskable(value)) {
    maskStackTrace(value)
  }

  return value
}

export default prepareValue
