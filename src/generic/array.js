import SafeArray from "../safe/array.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const ArrayProto = Array.prototype
  const SafeProto = SafeArray.prototype

  return {
    concat: unapply(SafeProto.concat),
    from: SafeArray.from,
    indexOf: unapply(ArrayProto.indexOf),
    join: unapply(ArrayProto.join),
    of: SafeArray.of,
    push: unapply(ArrayProto.push),
    unshift: unapply(ArrayProto.unshift)
  }
}

export default shared.inited
  ? shared.module.GenericArray
  : shared.module.GenericArray = init()
