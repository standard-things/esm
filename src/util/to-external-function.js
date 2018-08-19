import has from "./has.js"
import isObjectLike from "./is-object-like.js"
import setPrototypeOf from "./set-prototype-of.js"
import shared from "../shared.js"

function init() {
  const ExFunction = shared.external.Function

  const exFuncSuper = Reflect.getPrototypeOf(ExFunction)
  const exFuncProtoSuper = Reflect.getPrototypeOf(ExFunction.prototype)

  function toExternalFunction(func) {
    setPrototypeOf(func, exFuncSuper)

    if (has(func, "prototype")) {
      const { prototype } = func

      if (isObjectLike(prototype)) {
        setPrototypeOf(prototype, exFuncProtoSuper)
      }
    }

    return func
  }

  return toExternalFunction
}

export default shared.inited
  ? shared.module.utilToExternalFunction
  : shared.module.utilToExternalFunction = init()
