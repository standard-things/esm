import realRequire from "../real/require.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeUrl = shared.inited
  ? shared.module.safeUrl
  : shared.module.safeUrl = safe(realRequire("url"))

export const {
  URL,
  parse
} = safeUrl

export default safeUrl
