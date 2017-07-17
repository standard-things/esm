import assign from "./assign.js"

export default function createOptions(object, defaults) {
  return assign(Object.create(null), defaults, object)
}
