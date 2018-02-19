const { apply } = Reflect

function unapply(func) {
  return (thisArg, ...args) => apply(func, thisArg, args)
}

export default unapply
