import getPrototypeOf from "./get-prototype-of.js"
import has from "./has.js"
import isObjectLike from "./is-object-like.js"
import setPrototypeOf from "./set-prototype-of.js"
import shared from "../shared.js"

function init() {
  const ExFunction = shared.external.Function
  const ExFuncSuper = getPrototypeOf(ExFunction)
  const ExFuncProtoSuper = getPrototypeOf(ExFunction.prototype)

  function toExternalFunction(func) {
    if (has(func, "prototype")) {
      const { prototype } = func

      if (isObjectLike(prototype)) {
        setPrototypeOf(prototype, ExFuncProtoSuper)
      }
    }

    setPrototypeOf(func, ExFuncSuper)

    return func
  }

  return toExternalFunction
}

export default shared.inited
  ? shared.module.utilToExternalFunction
  : shared.module.utilToExternalFunction = init()
