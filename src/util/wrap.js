import shared from "../shared.js"

function init() {
  function wrap(func, wrapper) {
    return function (...args) {
      return Reflect.apply(wrapper, this, [func, args])
    }
  }

  return wrap
}

export default shared.inited
  ? shared.module.utilWrap
  : shared.module.utilWrap = init()
