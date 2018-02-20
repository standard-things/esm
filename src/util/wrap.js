function wrap(func, wrapper) {
  return function (...args) {
    return Reflect.apply(wrapper, this, [func, args])
  }
}

export default wrap
