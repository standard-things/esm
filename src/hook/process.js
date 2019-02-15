import ESM from "../constant/esm.js"

import Loader from "../loader.js"
import Wrapper from "../wrapper.js"

import isStackTraceMaskable from "../util/is-stack-trace-maskable.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import scrubStackTrace from "../error/scrub-stack-trace.js"

const {
  PACKAGE_RANGE
} = ESM

function hook(process) {
  function exceptionManagerWrapper(manager, func, args) {
    const wrapped = Wrapper.find(process, "_fatalException", PACKAGE_RANGE)

    return wrapped === null
      ? Reflect.apply(func, this, args)
      : Reflect.apply(wrapped, this, [manager, func, args])
  }

  function exceptionMethodWrapper(manager, func, args) {
    const [error] = args

    if (! Loader.state.package.default.options.debug &&
        isStackTraceMaskable(error)) {
      maskStackTrace(error)
    }

    return Reflect.apply(func, this, args)
  }

  function warningManagerWrapper(manager, func, args) {
    const wrapped = Wrapper.find(process, "emitWarning", PACKAGE_RANGE)

    return wrapped === null
      ? Reflect.apply(func, this, args)
      : Reflect.apply(wrapped, this, [manager, func, args])
  }

  function warningMethodWrapper(manager, func, args) {
    const [stack] = args

    if (typeof stack === "string") {
      args[0] = scrubStackTrace(stack)
    }

    return Reflect.apply(func, this, args)
  }

  Wrapper.manage(process, "_fatalException", exceptionManagerWrapper)
  Wrapper.wrap(process, "_fatalException", exceptionMethodWrapper)

  Wrapper.manage(process, "emitWarning", warningManagerWrapper)
  Wrapper.wrap(process, "emitWarning", warningMethodWrapper)
}

export default hook
