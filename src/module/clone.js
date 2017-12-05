import Module from "../module.js"

import getDescriptor from "../util/get-descriptor.js"
import setDescriptor from "../util/set-descriptor.js"

const { getOwnPropertyNames, getOwnPropertySymbols } = Object

function clone(mod) {
  const copy = new Module(mod.id, null)

  copy.id = mod.id
  copy.filename = mod.filename
  copy.parent = mod.parent

  const names = getOwnPropertyNames(mod)
  names.push(...getOwnPropertySymbols(mod))

  for (const name of names) {
    if (name !== "constructor") {
      setDescriptor(copy, name, getDescriptor(mod, name))
    }
  }

  return copy
}

export default clone
