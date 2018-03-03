const exProtos = {
  __proto__: null,
  Error: __external__.Error.prototype,
  EvalError: __external__.EvalError.prototype,
  RangeError: __external__.RangeError.prototype,
  ReferenceError: __external__.ReferenceError.prototype,
  SyntaxError: __external__.SyntaxError.prototype,
  TypeError: __external__.TypeError.prototype,
  URIError: __external__.URIError.prototype
}

function toExternalError(error) {
  const proto = Reflect.getPrototypeOf(error)
  const name = proto ? proto.name : error.name
  const exProto = exProtos[name]

  if (exProto) {
    Reflect.setPrototypeOf(error, exProto)
  }

  return error
}

export default toExternalError
