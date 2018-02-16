import SafeDate from "../builtin/date.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  return {
    __proto__: null,
    getTime: unapply(SafeDate.prototype.getTime)
  }
}

export default shared.inited
  ? shared.generic.Date
  : shared.generic.Date = init()
