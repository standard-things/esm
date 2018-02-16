const funcProto = Function.prototype
const funcApply = funcProto.call.bind(funcProto.apply)

const apply = typeof Reflect === "object" && Reflect !== null
  ? Reflect.apply
  : (target, thisArg, args) => funcApply(target, thisArg, args)

export default apply
