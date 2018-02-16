import GenericFunction from "../generic/function.js"
import Wrapper from "../wrapper.js"

import isError from "../util/is-error.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import scrubStackTrace from "../error/scrub-stack-trace.js"
import { version } from "../version.js"

function hook(process) {
  function exceptionManagerWrapper(manager, func, args) {
    const wrapped = Wrapper.find(process, "_fatalException", version)

    return wrapped
      ? GenericFunction.call(wrapped, this, manager, func, args)
      : GenericFunction.apply(func, this, args)
  }

  function exceptionMethodWrapper(manager, func, args) {
    const [error] = args

    if (isError(error) &&
        ! isStackTraceMasked(error)) {
      maskStackTrace(error)
    }

    return GenericFunction.apply(func, this, args)
  }

  function warningManagerWrapper(manager, func, args) {
    const wrapped = Wrapper.find(process, "emitWarning", version)

    return wrapped
      ? GenericFunction.call(wrapped, this, manager, func, args)
      : GenericFunction.apply(func, this, args)
  }

  function warningMethodWrapper(manager, func, args) {
    const [stack] = args

    if (typeof stack === "string") {
      args[0] = scrubStackTrace(stack)
    }

    return GenericFunction.apply(func, this, args)
  }

  Wrapper.manage(process, "_fatalException", exceptionManagerWrapper)
  Wrapper.wrap(process, "_fatalException", exceptionMethodWrapper)

  Wrapper.manage(process, "emitWarning", warningManagerWrapper)
  Wrapper.wrap(process, "emitWarning", warningMethodWrapper)
}

export default hook
