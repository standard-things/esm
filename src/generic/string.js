import SafeString from "../builtin/string.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const stringProto = SafeString.prototype

  return {
    __proto__: null,
    charCodeAt: unapply(stringProto.charCodeAt),
    endsWith: unapply(stringProto.endsWith),
    indexOf: unapply(stringProto.indexOf),
    lastIndexOf: unapply(stringProto.lastIndexOf),
    replace: unapply(stringProto.replace),
    slice: unapply(stringProto.slice),
    startsWith: unapply(stringProto.startsWith),
    trim: unapply(stringProto.trim)
  }
}

export default shared.inited
  ? shared.generic.String
  : shared.generic.String = init()
