import setGetter from "./set-getter.js"
import setProperty from "./set-property.js"
import setSetter from "./set-setter.js"

function setDeferred(object, key, getter) {
  setGetter(object, key, () => object[key] = getter())

  setSetter(object, key, (value) => {
    setProperty(object, key, { value })
  })

  return object
}

export default setDeferred
