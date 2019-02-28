import getPrototypeOf from "../util/get-prototype-of.js"
import isNative from "../util/is-native.js"
import shared from "../shared.js"

function init() {
  const ExError = shared.external.Error

  function getBuiltinErrorConstructor(error) {
    if (error instanceof Error) {
      return Error
    }

    if (error instanceof ExError) {
      return ExError
    }

    let proto = error

    while ((proto = getPrototypeOf(proto)) !== null) {
      const ctor = proto ? proto.constructor : void 0

      if (typeof ctor === "function" &&
          ctor.name === "Error" &&
          isNative(ctor)) {
        return ctor
      }
    }

    return ExError
  }

  return getBuiltinErrorConstructor
}

export default shared.inited
  ? shared.module.errorGetBuiltinErrorConstructor
  : shared.module.errorGetBuiltinErrorConstructor = init()
