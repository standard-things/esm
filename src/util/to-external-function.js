import has from "./has.js"
import shared from "../shared.js"

function init() {
  const ExFunction = __external__.Function

  const exFuncSuper = Reflect.getPrototypeOf(ExFunction)
  const exFuncProtoSuper = Reflect.getPrototypeOf(ExFunction.prototype)

  function toExternalFunction(func) {
    Reflect.setPrototypeOf(func, exFuncSuper)

    if (has(func, "prototype")) {
      Reflect.setPrototypeOf(func.prototype, exFuncProtoSuper)
    }

    return func
  }

  return toExternalFunction
}

export default shared.inited
  ? shared.module.utilToExternalFunction
  : shared.module.utilToExternalFunction = init()
