import shared from "../shared.js"

function init() {
  function toWrapper(func) {
    return function (unwrapped, args) {
      return Reflect.apply(func, this, args)
    }
  }

  return toWrapper
}

export default shared.inited
  ? shared.module.utilToWrapper
  : shared.module.utilToWrapper = init()
