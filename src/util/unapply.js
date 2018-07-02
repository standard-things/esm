import shared from "../shared.js"

function init() {
  function unapply(func) {
    return (thisArg, ...args) => Reflect.apply(func, thisArg, args)
  }

  return unapply
}

export default shared.inited
  ? shared.module.utilUnapply
  : shared.module.utilUnapply = init()
