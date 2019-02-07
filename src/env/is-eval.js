import { argv, stdin } from "../safe/process.js"

import getFlags from "./get-flags.js"
import isPreloaded from "./is-preloaded.js"
import isPrint from "./is-print.js"
import shared from "../shared.js"

function init() {
  function isEval() {
    if (isPrint()) {
      return true
    }

    const { length } = argv

    if (length > 1 ||
        ! isPreloaded()) {
      return false
    }

    const flags = getFlags()

    if (length === 1 &&
        flags.eval) {
      return true
    }

    return length === 0 &&
      ! stdin.isTTY &&
      ! flags.interactive
  }

  return isEval
}

export default shared.inited
  ? shared.module.envIsEval
  : shared.module.envIsEval = init()
