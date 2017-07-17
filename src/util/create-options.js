import assign from "./assign.js"

function createOptions(object, defaults) {
  return assign(Object.create(null), defaults, object)
}

export default createOptions
