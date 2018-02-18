import SafeArray from "../builtin/array.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const arrayProto = SafeArray.prototype

  return {
    __proto__: null,
    concat: unapply(arrayProto.concat),
    filter: unapply(arrayProto.filter),
    indexOf: unapply(arrayProto.indexOf),
    join: unapply(arrayProto.join),
    push: unapply(arrayProto.push),
    slice: unapply(arrayProto.slice),
    some: unapply(arrayProto.some),
    unshift: unapply(arrayProto.unshift)
  }
}

export default shared.inited
  ? shared.generic.Array
  : shared.generic.Array = init()
