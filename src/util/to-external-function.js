import getPrototypeOf from "./get-prototype-of.js"
import has from "./has.js"
import setPrototypeOf from "./set-prototype-of.js"
import shared from "../shared.js"

function init() {
  const ExFunction = shared.external.Function
  const ExFuncSuper = getPrototypeOf(ExFunction)
  const ExFuncProtoSuper = getPrototypeOf(ExFunction.prototype)

  function toExternalFunction(func) {
    setPrototypeOf(func, ExFuncSuper)

    if (has(func, "prototype")) {
      setPrototypeOf(func.prototype, ExFuncProtoSuper)
    }

    return func
  }

  return toExternalFunction
}

export default shared.inited
  ? shared.module.utilToExternalFunction
  : shared.module.utilToExternalFunction = init()
