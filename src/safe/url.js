import realURL from "../real/url.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeURL = shared.inited
  ? shared.module.safeURL
  : shared.module.safeURL = safe(realURL)

export const {
  URL,
  domainToUnicode,
  parse
} = safeURL

export default safeURL
