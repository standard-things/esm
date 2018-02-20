import defaults from "./defaults.js"

function toNullObject(object, source) {
  return defaults({ __proto__: null }, object, source)
}

export default toNullObject
