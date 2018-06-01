import SafeArray from "../safe/array.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const proto = Array.prototype
  const safeProto = SafeArray.prototype

  return {
    concat: unapply(safeProto.concat),
    filter: unapply(safeProto.filter),
    from: SafeArray.from,
    indexOf: unapply(proto.indexOf),
    of: SafeArray.of,
    push: unapply(proto.push),
    some: unapply(proto.some),
    unshift: unapply(proto.unshift)
  }
}

export default shared.inited
  ? shared.module.GenericArray
  : shared.module.GenericArray = init()
