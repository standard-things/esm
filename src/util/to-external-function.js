const ExFunction = __external__.Function

const exFuncSuper = Object.getPrototypeOf(ExFunction)
const exFuncProtoSuper = Object.getPrototypeOf(ExFunction.prototype)

function toExternalFunction(func) {
  Object.setPrototypeOf(func.prototype, exFuncProtoSuper)
  return Object.setPrototypeOf(func, exFuncSuper)
}

export default toExternalFunction
