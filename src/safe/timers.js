import realRequire from "../real/require.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeTimers = shared.inited
  ? shared.module.safeTimers
  : shared.module.safeTimers = safe(realRequire("timers"))

export const {
  setImmediate
} = safeTimers

export default safeTimers
