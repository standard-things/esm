import Wrapper from "../wrapper.js"

import isError from "../util/is-error.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import scrubStackTrace from "../error/scrub-stack-trace.js"
import shared from "../shared.js"

function hook(process) {
  function exceptionManagerWrapper(manager, func, args) {
    const pkg = shared.package.default
    const wrapped = Wrapper.find(process, "_fatalException", pkg.range)

    return wrapped
      ? wrapped.call(this, manager, func, args)
      : func.apply(this, args)
  }

  function exceptionMethodWrapper(manager, func, args) {
    const [error] = args

    if (isError(error) &&
        ! isStackTraceMasked(error)) {
      maskStackTrace(error)
    }

    return func.apply(this, args)
  }

  function warningManagerWrapper(manager, func, args) {
    const pkg = shared.package.default
    const wrapped = Wrapper.find(process, "emitWarning", pkg.range)

    return wrapped
      ? wrapped.call(this, manager, func, args)
      : func.apply(this, args)
  }

  function warningMethodWrapper(manager, func, args) {
    const [stack] = args

    if (typeof stack === "string") {
      args[0] = scrubStackTrace(stack)
    }

    return func.apply(this, args)
  }

  Wrapper.manage(process, "_fatalException", exceptionManagerWrapper)
  Wrapper.wrap(process, "_fatalException", exceptionMethodWrapper)

  Wrapper.manage(process, "emitWarning", warningManagerWrapper)
  Wrapper.wrap(process, "emitWarning", warningMethodWrapper)
}

export default hook
