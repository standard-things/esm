import SafeArray from "../safe/array.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const { prototype } = Array
  const safeProto = SafeArray.prototype

  return {
    concat: unapply(safeProto.concat),
    from: SafeArray.from,
    indexOf: unapply(prototype.indexOf),
    join: unapply(prototype.join),
    of: SafeArray.of,
    push: unapply(prototype.push),
    unshift: unapply(prototype.unshift)
  }
}

export default shared.inited
  ? shared.module.GenericArray
  : shared.module.GenericArray = init()
