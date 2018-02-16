import SafeRegExp from "../builtin/regexp.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const regexpProto = SafeRegExp.prototype

  return {
    __proto__: null,
    exec: unapply(regexpProto.exec),
    test: unapply(regexpProto.test)
  }
}

export default shared.inited
  ? shared.generic.RegExp
  : shared.generic.RegExp = init()
