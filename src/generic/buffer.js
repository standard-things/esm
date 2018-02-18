import SafeBuffer from "../builtin/buffer.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  return {
    __proto__: null,
    concat: SafeBuffer.concat,
    slice: unapply(SafeBuffer.prototype.slice)
  }
}

export default shared.inited
  ? shared.generic.Buffer
  : shared.generic.Buffer = init()
