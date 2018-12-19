import ENV from "../constant/env.js"

import realTimers from "../real/timers.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

function init() {
  const {
    ELECTRON
  } = ENV

  const safeTimers = safe(realTimers)
  const { unsafeGlobal } = shared

  if (ELECTRON) {
    safeTimers.setImmediate = unsafeGlobal.setImmediate
    safeTimers.setInterval = unsafeGlobal.setInterval
    safeTimers.setTimeout = unsafeGlobal.setTimeout
  }

  return safeTimers
}

const safeTimers = shared.inited
  ? shared.module.safeTimers
  : shared.module.safeTimers = init()

export const {
  setImmediate
} = safeTimers

export default safeTimers
