import shared from "../shared.js"

function init() {
  const emptyArgs = []

  function call(target, thisArg) {
    const { length } = arguments

    if (length < 3) {
      return Reflect.apply(target, thisArg, emptyArgs)
    }

    let index = 1

    const args = new Array(length - 2)

    while (++index < length) {
      args[index - 2] = arguments[index]
    }

    return Reflect.apply(target, thisArg, args)
  }

  return call
}

export default shared.inited
  ? shared.module.utilCall
  : shared.module.utilCall = init()
