import silent from "./silent.js"

function getSilent(object, name) {
  const value = silent(() => {
    try {
      return object[name]
    } catch (e) {}
  })

  if (typeof value !== "function") {
    return value
  }

  return function (...args) {
    return silent(() => Reflect.apply(value, this, args))
  }
}

export default getSilent
