import silent from "./silent.js"

function getSilent(object, name) {
  const value = tryGet(object, name)

  if (typeof value !== "function") {
    return value
  }

  return function (...args) {
    return silent(() => Reflect.apply(value, this, args))
  }
}

function tryGet(object, name) {
  try {
    return silent(() => object[name])
  } catch (e) {}
}

export default getSilent
