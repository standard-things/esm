import SafeArray from "../safe/array.js"

import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const { prototype } = SafeArray

  return {
    __proto__: null,
    concat: unapply(prototype.concat),
    filter: unapply(prototype.filter),
    indexOf: unapply(prototype.indexOf),
    join: unapply(prototype.join),
    push: unapply(prototype.push),
    slice: unapply(prototype.slice),
    some: unapply(prototype.some),
    unshift: unapply(prototype.unshift)
  }
}

export default shared.inited
  ? shared.generic.Array
  : shared.generic.Array = init()
