function wrapCall(func, wrapper) {
  return function () {
    let i = 0
    const argCount = arguments.length + 1
    const args = new Array(argCount)

    while (++i < argCount) {
      args[i] = arguments[i - 1]
    }

    args[0] = func
    return wrapper.apply(this, args)
  }
}

export default wrapCall
