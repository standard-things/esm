import ESM from "../constant/esm.js"

import constructError from "../error/construct-error.js"
import emptyArray from "./empty-array.js"
import getStackFrames from "../error/get-stack-frames.js"
import isOwnPath from "./is-own-path.js"

const {
  STACK_TRACE_LIMIT
} = ESM

function isCalledFromStrictCode() {
  "use sloppy"

  const frames = getStackFrames(constructError(Error, emptyArray, STACK_TRACE_LIMIT))

  for (const frame of frames) {
    const filename = frame.getFileName()

    if (filename &&
        ! isOwnPath(filename) &&
        ! frame.isNative()) {
      return frame.getFunction() === void 0
    }
  }

  return false
}

export default isCalledFromStrictCode
