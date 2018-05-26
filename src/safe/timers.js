import realTimers from "../real/timers.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeTimers = shared.inited
  ? shared.module.safeTimers
  : shared.module.safeTimers = safe(realTimers)

export const {
  setImmediate
} = safeTimers

export default safeTimers
