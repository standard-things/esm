import shared from "../shared.js"

function init() {
  const dataDescriptor = {
    configurable: true,
    enumerable: true,
    value: void 0,
    writable: true
  }

  function setProperty(object, name, value) {
    dataDescriptor.value = value
    Reflect.defineProperty(object, name, dataDescriptor)
    return object
  }

  return setProperty
}

export default shared.inited
  ? shared.module.utilSetProperty
  : shared.module.utilSetProperty = init()
