import ENV from "../constant/env.js"

import realTimers from "../real/timers.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const {
    ELECTRON
  } = ENV

  const safeTimers = safe(realTimers)

  if (ELECTRON) {
    const { unsafeGlobal } = shared

    setProperty(safeTimers, "setImmediate", unsafeGlobal.setImmediate)
    setProperty(safeTimers, "setInterval", unsafeGlobal.setInterval)
    setProperty(safeTimers, "setTimeout", unsafeGlobal.setTimeout)
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
