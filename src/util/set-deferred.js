import setGetter from "./set-getter.js"
import setSetter from "./set-setter.js"

function setDeferred(object, name, getter) {
  setGetter(object, name, () => {
    object[name] = void 0
    return object[name] = getter()
  })

  setSetter(object, name, (value) => {
    Reflect.defineProperty(object, name, {
      configurable: true,
      enumerable: true,
      value,
      writable: true
    })
  })

  return object
}

export default setDeferred
