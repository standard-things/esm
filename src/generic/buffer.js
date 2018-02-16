import SafeBuffer from "../builtin/buffer.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const bufferProto = SafeBuffer.prototype

  return {
    __proto__: null,
    concat: SafeBuffer.concat,
    slice: unapply(bufferProto.slice),
    toString: unapply(bufferProto.toString)
  }
}

export default shared.inited
  ? shared.generic.Buffer
  : shared.generic.Buffer = init()
