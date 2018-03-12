import silent from "./silent.js"

function getSilent(object, key) {
  const value = tryGet(object, key)

  if (typeof value !== "function") {
    return value
  }

  return function (...args) {
    return silent(() => Reflect.apply(value, this, args))
  }
}

function tryGet(object, key) {
  try {
    return silent(() => object[key])
  } catch (e) {}
}

export default getSilent
