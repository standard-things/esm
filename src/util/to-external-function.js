const ExFunction = __external__.Function

const exFuncSuper = Reflect.getPrototypeOf(ExFunction)
const exFuncProtoSuper = Reflect.getPrototypeOf(ExFunction.prototype)

function toExternalFunction(func) {
  Reflect.setPrototypeOf(func.prototype, exFuncProtoSuper)
  Reflect.setPrototypeOf(func, exFuncSuper)
  return func
}

export default toExternalFunction
