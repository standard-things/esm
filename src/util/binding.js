import FastObject from "../fast-object.js"

const _binding = process.binding
const bindingCache = new FastObject

function binding(id) {
  if (id in bindingCache) {
    return bindingCache[id]
  }

  try {
    return bindingCache[id] = _binding(id)
  } catch (e) {}

  return bindingCache[id] = Object.create(null)
}

export default binding
