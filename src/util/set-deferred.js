import setGetter from "./set-getter.js"
import setSetter from "./set-setter.js"

function setDeferred(object, key, getter) {
  setGetter(object, key, () => object[key] = getter())

  setSetter(object, key, (value) => {
    Reflect.defineProperty(object, key, {
      __proto__: null,
      configurable: true,
      enumerable: true,
      value,
      writable: true
    })
  })

  return object
}

export default setDeferred
