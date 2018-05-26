import realUrl from "../real/url.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeUrl = shared.inited
  ? shared.module.safeUrl
  : shared.module.safeUrl = safe(realUrl)

export const {
  URL,
  domainToUnicode,
  parse
} = safeUrl

export default safeUrl
