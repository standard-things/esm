import has from "./has.js"

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

export default toExternalFunction
