import constructError from "../error/construct-error.js"
import emptyArray from "./empty-array.js"
import getStackFrames from "../error/get-stack-frames.js"
import isOwnPath from "./is-own-path.js"
import shared from "../shared.js"

function init() {
  "use sloppy"

  function isCalledFromStrictCode() {
    const frames = getStackFrames(constructError(Error, emptyArray))

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

  return isCalledFromStrictCode
}

export default shared.inited
  ? shared.module.utilIsCalledFromStrictCode
  : shared.module.utilIsCalledFromStrictCode = init()
