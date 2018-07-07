import shared from "../shared.js"

function init() {
  const emptyArray = []

  function call(target, thisArg) {
    return Reflect.apply(target, thisArg, emptyArray)
  }

  return call
}

export default shared.inited
  ? shared.module.utilCall
  : shared.module.utilCall = init()
