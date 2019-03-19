import getPrototypeOf from "../util/get-prototype-of.js"
import isNative from "../util/is-native.js"
import shared from "../shared.js"

function init() {
  const ExError = shared.external.Error

  function getBuiltinErrorConstructor(error) {
    if (error instanceof Error ||
        error === Error.prototype) {
      return Error
    }

    if (error instanceof ExError ||
        error === ExError.prototype) {
      return ExError
    }

    let proto = error

    while ((proto = getPrototypeOf(proto)) !== null) {
      const Ctor = proto.constructor

      if (typeof Ctor === "function" &&
          Ctor.name === "Error" &&
          isNative(Ctor)) {
        return Ctor
      }
    }

    return ExError
  }

  return getBuiltinErrorConstructor
}

export default shared.inited
  ? shared.module.errorGetBuiltinErrorConstructor
  : shared.module.errorGetBuiltinErrorConstructor = init()
