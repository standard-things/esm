import shared from "../shared.js"

function init() {
  function constructStackless(ErrorCtor, args) {
    const { stackTraceLimit } = Error

    Error.stackTraceLimit = 0

    const error = Reflect.construct(ErrorCtor, args)

    Error.stackTraceLimit = stackTraceLimit
    return error
  }

  return constructStackless
}

export default shared.inited
  ? shared.module.errorConstructStackless
  : shared.module.errorConstructStackless = init()
