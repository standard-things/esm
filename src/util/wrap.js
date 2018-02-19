const { apply } = Reflect

function wrap(func, wrapper) {
  return function (...args) {
    return apply(wrapper, this, [func, args])
  }
}

export default wrap
