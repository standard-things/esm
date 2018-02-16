import SafeArray from "../builtin/array.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const arrayProto = SafeArray.prototype

  return {
    __proto__: null,
    indexOf: unapply(arrayProto.indexOf),
    isArray: SafeArray.isArray,
    join: unapply(arrayProto.join),
    map: unapply(arrayProto.map),
    push: unapply(arrayProto.push),
    reverse: unapply(arrayProto.reverse),
    slice: unapply(arrayProto.slice),
    some: unapply(arrayProto.some),
    sort: unapply(arrayProto.sort)
  }
}

export default shared.inited
  ? shared.generic.Array
  : shared.generic.Array = init()
