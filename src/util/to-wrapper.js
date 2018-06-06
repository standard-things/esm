function toWrapper(func) {
  return function (unwrapped, args) {
    return Reflect.apply(func, this, args)
  }
}

export default toWrapper
