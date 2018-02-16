const funcProto = Function.prototype
const funcApply = funcProto.call.bind(funcProto.apply)
const reflectApply = typeof Reflect === "object" && Reflect !== null
  ? Reflect.apply
  : (target, args) => funcApply(target, thisArg, args)

function unapply(func) {
  return (thisArg, ...args) => reflectApply(func, thisArg, args)
}

export default unapply
