import silent from "./silent.js"

function getSilent(object, key) {
  const value = silent(() => object[key])

  if (typeof value !== "function") {
    return value
  }

  return function (...args) {
    return silent(() => value.apply(this, args))
  }
}

export default getSilent
