import shared from "../shared.js"

function init() {
  const { external } = shared

  const exProtoMap = {
    __proto__: null,
    Error: external.Error.prototype,
    EvalError: external.EvalError.prototype,
    RangeError: external.RangeError.prototype,
    ReferenceError: external.ReferenceError.prototype,
    SyntaxError: external.SyntaxError.prototype,
    TypeError: external.TypeError.prototype,
    URIError: external.URIError.prototype
  }

  function toExternalError(error) {
    const proto = Reflect.getPrototypeOf(error)
    const name = proto ? proto.name : error.name
    const exProto = exProtoMap[name]

    if (exProto) {
      Reflect.setPrototypeOf(error, exProto)
    }

    return error
  }

  return toExternalError
}

export default shared.inited
  ? shared.module.utilExternalError
  : shared.module.utilExternalError = init()
