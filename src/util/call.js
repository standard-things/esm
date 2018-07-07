import shared from "../shared.js"

function init() {
  const emptyArgs = []

  function call(target, thisArg) {
    return Reflect.apply(target, thisArg, emptyArgs)
  }

  return call
}

export default shared.inited
  ? shared.module.utilCall
  : shared.module.utilCall = init()
