import builtinLookup from "../builtin-lookup.js"
import isObjectLike from "../util/is-object-like.js"
import safeRequire from "../safe/require.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

function init() {
  if (! builtinLookup.has("punycode")) {
    return
  }

  const realPunycode = safeRequire("punycode")

  if (isObjectLike(realPunycode)) {
    return unwrapProxy(realPunycode)
  }
}

export default shared.inited
  ? shared.module.realPunycode
  : shared.module.realPunycode = init()
