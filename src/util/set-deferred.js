import call from "./call.js"
import setGetter from "./set-getter.js"
import setSetter from "./set-setter.js"

function setDeferred(object, name, getter) {
  setGetter(object, name, function () {
    this[name] = void 0
    return this[name] = call(getter, this)
  })

  setSetter(object, name, function (value) {
    Reflect.defineProperty(this, name, {
      configurable: true,
      enumerable: true,
      value,
      writable: true
    })
  })

  return object
}

export default setDeferred
