import Loader from "../loader.js"

import isStackTraceMaskable from "./is-stack-trace-maskable.js"
import maskStackTrace from "../error/mask-stack-trace.js"

function prepareValue(value) {
  // This function may be called before `Loader.state.package.default` is set.
  const defaultPkg = Loader.state.package.default

  if ((defaultPkg === null ||
       ! defaultPkg.options.debug) &&
      isStackTraceMaskable(value)) {
    maskStackTrace(value)
  }

  return value
}

export default prepareValue
