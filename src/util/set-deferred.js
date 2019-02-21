import setGetter from "./set-getter.js"
import setSetter from "./set-setter.js"

const dataDescriptor = {
  configurable: true,
  enumerable: true,
  value: void 0,
  writable: true
}

const emptyArray = []

function setDeferred(object, name, getter) {
  setGetter(object, name, function () {
    this[name] = void 0

    return this[name] = Reflect.apply(getter, this, emptyArray)
  })

  setSetter(object, name, function (value) {
    dataDescriptor.value = value
    Reflect.defineProperty(this, name, dataDescriptor)
  })

  return object
}

export default setDeferred
