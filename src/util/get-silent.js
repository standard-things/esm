import silent from "./silent.js"

const { apply } = Reflect

function getSilent(object, key) {
  const value = silent(() => object[key])

  if (typeof value !== "function") {
    return value
  }

  return function (...args) {
    return silent(() => apply(value, this, args))
  }
}

export default getSilent
