import SafeBuffer from "../safe/buffer.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  return {
    alloc: SafeBuffer.alloc,
    concat: SafeBuffer.concat,
    slice: unapply(SafeBuffer.prototype.slice)
  }
}

export default shared.inited
  ? shared.module.GenericBuffer
  : shared.module.GenericBuffer = init()
