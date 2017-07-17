export default function wrapApply(func, wrapper) {
  return function () {
    let i = -1
    const argCount = arguments.length
    const args = new Array(argCount)

    while (++i < argCount) {
      args[i] = arguments[i]
    }

    return wrapper.call(this, func, args)
  }
}
