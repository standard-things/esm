function wrapApply(func, wrapper) {
  return function (...args) {
    return wrapper.call(this, func, args)
  }
}

export default wrapApply
