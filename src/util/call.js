import apply from "./apply.js"

function call(target, thisArg, ...args) {
  return apply(target, thisArg, args)
}

export default call
