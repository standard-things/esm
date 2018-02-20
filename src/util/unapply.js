function unapply(func) {
  return (thisArg, ...args) => Reflect.apply(func, thisArg, args)
}

export default unapply
