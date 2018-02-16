import call from "./call.js"

function wrap(func, wrapper) {
  return function (...args) {
    return call(wrapper, this, func, args)
  }
}

export default wrap
